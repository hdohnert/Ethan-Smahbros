import { useEffect, useState } from 'react';
import { enterFullscreen, lockLandscape, unlockAudio, wakeLock, type WakeLockMode } from '../lib/screen';
import { useIdle } from '../lib/useIdleCursor';
import { theme } from '../theme';
import { Board } from './Board';
import { sampleMatch, samplePlayers } from './sampleData';
import './display.css';

// Sound is off until phase 3 adds the Control toggle.
const SOUND_ON = false;

export function DisplayView() {
  const [started, setStarted] = useState(false);
  const [lockMode, setLockMode] = useState<WakeLockMode>('off');
  const [showStatus, setShowStatus] = useState(false);
  const idle = useIdle(started, 2000);

  useEffect(() => {
    wakeLock.onChange = setLockMode;
    return () => {
      wakeLock.onChange = null;
    };
  }, []);

  async function start() {
    // Everything that needs a user gesture happens in this one tap.
    // Start them all synchronously, then show the board right away: none of
    // these promises is allowed to hold up the show if a browser stalls.
    const fs = enterFullscreen();
    const lock = wakeLock.enable();
    if (SOUND_ON) void unlockAudio();
    setStarted(true);
    void fs.then(lockLandscape);
    await Promise.race([lock, new Promise((r) => setTimeout(r, 3000))]);
    setShowStatus(true);
    window.setTimeout(() => setShowStatus(false), 5000);
  }

  return (
    <div className={`display${idle ? ' display--idle' : ''}`}>
      <div className="starfield" aria-hidden />
      {started ? (
        <Board players={samplePlayers} match={sampleMatch} />
      ) : (
        <StartScreen onStart={start} />
      )}
      {showStatus && (
        <div className="status-pill">
          {lockMode === 'off' ? '⚠️ Screen may sleep: set Auto-Lock to Never' : '✅ Screen will stay on'}
        </div>
      )}
      <div className="rotate-overlay">
        <div className="rotate-overlay__icon">📱↻</div>
        <div>Rotate to landscape</div>
      </div>
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="start safe">
      <h1 className="start__title">{theme.title}</h1>
      <button className="start__btn" onClick={onStart} autoFocus>
        Tap to start the show
      </button>
      <p className="start__hint">Goes full screen and keeps the screen awake</p>
    </div>
  );
}
