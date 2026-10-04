// Browser plumbing for the TV: full screen, screen wake lock, orientation lock
// and audio unlock. Everything here must be kicked off from a user tap.

import noSleepMedia from 'nosleep.js/src/media.js';

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitFullscreenElement?: Element | null };

/** True when launched from the home screen (iOS/Android PWA) or a browser's app window. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Enters full screen where the Fullscreen API exists (iPad, Mac, Android). No-op on iPhone and in a PWA. */
export async function enterFullscreen(): Promise<boolean> {
  if (isStandalone()) return false;
  const doc = document as FsDocument;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) return true;
  const el = document.documentElement as FsElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    // Refused (not from a gesture, or unsupported). The PWA path still hides the bars.
  }
  return false;
}

/** Locks to landscape where allowed (usually only Android in full screen). */
export async function lockLandscape(): Promise<void> {
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  try {
    await orientation?.lock?.('landscape');
  } catch {
    // Most browsers refuse; the "Rotate to landscape" overlay covers it.
  }
}

export type WakeLockMode = 'native' | 'video' | 'off';

/**
 * Keeps the screen awake. Prefers the Screen Wake Lock API and falls back to a
 * muted looping inline video (the classic NoSleep trick) for older iOS.
 * Re-acquires automatically when the page becomes visible again.
 */
class WakeLockKeeper {
  private sentinel: WakeLockSentinel | null = null;
  private video: HTMLVideoElement | null = null;
  private wanted = false;
  mode: WakeLockMode = 'off';
  onChange: ((mode: WakeLockMode) => void) | null = null;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') void this.acquire();
    });
  }

  async enable(): Promise<WakeLockMode> {
    this.wanted = true;
    return this.acquire();
  }

  private setMode(mode: WakeLockMode) {
    this.mode = mode;
    this.onChange?.(mode);
  }

  private async acquire(): Promise<WakeLockMode> {
    if ('wakeLock' in navigator) {
      try {
        if (!this.sentinel || this.sentinel.released) {
          this.sentinel = await navigator.wakeLock.request('screen');
          this.sentinel.addEventListener('release', () => {
            if (this.mode === 'native') this.setMode('off');
            // Re-request right away if we're still visible (e.g. the OS dropped it).
            if (this.wanted && document.visibilityState === 'visible') {
              setTimeout(() => void this.acquire(), 1000);
            }
          });
        }
        this.setMode('native');
        return this.mode;
      } catch {
        // Fall through to the video trick.
      }
    }
    return this.playVideo();
  }

  private async playVideo(): Promise<WakeLockMode> {
    if (!this.video) {
      const v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.muted = true;
      v.loop = true;
      v.setAttribute('title', 'keep awake');
      v.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;left:0;top:0;';
      for (const [type, src] of [
        ['video/webm', noSleepMedia.webm],
        ['video/mp4', noSleepMedia.mp4],
      ] as const) {
        const s = document.createElement('source');
        s.type = type;
        s.src = src;
        v.appendChild(s);
      }
      document.body.appendChild(v);
      this.video = v;
    }
    try {
      await this.video.play();
      this.setMode('video');
    } catch {
      this.setMode('off');
    }
    return this.mode;
  }
}

export const wakeLock = new WakeLockKeeper();

let audioCtx: AudioContext | null = null;

/** Creates and resumes the shared AudioContext; must be called from a tap. */
export async function unlockAudio(): Promise<AudioContext | null> {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx ??= new Ctx();
    if (audioCtx.state !== 'running') await audioCtx.resume();
    // A one-sample silent buffer finishes the unlock on iOS.
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    return audioCtx;
  } catch {
    return null;
  }
}

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}
