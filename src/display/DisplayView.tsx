import { useCallback, useEffect, useMemo, useState } from 'react';
import { isConfigured } from '../data/supabase';
import { useAuth } from '../data/useAuth';
import { useSnapshot, type Source } from '../data/useSnapshot';
import { enterFullscreen, isStandalone, lockLandscape, unlockAudio, wakeLock, type WakeLockMode } from '../lib/screen';
import { useIdle } from '../lib/useIdleCursor';
import { appUrl, copyText, store } from '../ui/device';
import { Board } from './Board';
import { EndCard } from './EndCard';
import { buildModel, type BoardModel } from './model';
import { sampleModel } from './sampleData';
import { TicketBank } from './TicketBank';
import { HeroScreen } from './HeroScreen';
import { RulesScreen } from './RulesScreen';
import { LrcScreen } from './LrcScreen';
import { PrizeScreen } from './PrizeScreen';
import { SmashRulesScreen } from './SmashRulesScreen';
import { PhotoScreen } from './PhotoScreen';
import { TriviaScreen } from './TriviaScreen';
import { ATTRACT_AFTER_MS, ATTRACT_SLIDE_MS } from '../effects/config';
import { HypeWord, Kickoff, MomentOverlay, TicketShower } from '../effects/Overlays';
import { FiveMinuteAlert, SingOverlay } from '../effects/Party';
import { useEffectsEngine } from '../effects/useEffectsEngine';
import { useReducedMotion } from '../effects/useReducedMotion';
import './display.css';

const BANK_EVERY_MS = 3 * 60 * 1000;
const BANK_FOR_MS = 15 * 1000;

function hashParams() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '');
}

/** Read-only token from the link (#/display?t=…), remembered on this device. */
function useDisplayToken(): [string | null, (t: string | null) => void] {
  const [token, setToken] = useState<string | null>(() => {
    const fromUrl = hashParams().get('t');
    if (fromUrl) store('display-token', fromUrl);
    return fromUrl ?? store('display-token');
  });
  return [token, (t) => setToken(store('display-token', t))];
}

export function DisplayView({ trivia }: { trivia?: boolean } = {}) {
  const sample = !isConfigured || hashParams().has('sample');
  const [token, setToken] = useDisplayToken();
  const auth = useAuth();
  const src: Source | null = sample ? null : token ? { kind: 'token', token } : auth.owner ? { kind: 'owner' } : null;
  const live = useSnapshot(src);
  const model = useMemo<BoardModel | null>(() => {
    if (sample) return sampleModel();
    return live.snap && live.derived ? buildModel(live.snap, live.derived, live.balances) : null;
  }, [sample, live.snap, live.derived, live.balances]);

  // A revoked or mistyped token: forget it and ask again.
  const badToken = !!token && !live.snap && /not allowed/i.test(live.error ?? '');
  useEffect(() => {
    if (badToken) setToken(null);
  }, [badToken, setToken]);

  const needsLink = !sample && !src && !auth.loading;
  return <Show model={model} needsLink={needsLink} onToken={setToken} offline={!sample && !live.online} token={token} trivia={trivia} />;
}

function Show({
  model,
  needsLink,
  onToken,
  offline,
  token,
  trivia,
}: {
  model: BoardModel | null;
  needsLink: boolean;
  onToken: (t: string) => void;
  offline: boolean;
  token: string | null;
  /** The second TV: trivia only, no tournament screens or effects. */
  trivia?: boolean;
}) {
  const [started, setStarted] = useState(false);
  const [kickoff, setKickoff] = useState(false);
  const [lockMode, setLockMode] = useState<WakeLockMode>('off');
  const [showStatus, setShowStatus] = useState(false);
  const idle = useIdle(started, 2000);
  const reduced = useReducedMotion();
  const view = useView(model);
  const fx = useEffectsEngine(model, started && !kickoff && !trivia, reduced);
  const endKickoff = useCallback(() => setKickoff(false), []);

  useEffect(() => {
    wakeLock.onChange = setLockMode;
    return () => {
      wakeLock.onChange = null;
    };
  }, []);

  async function start() {
    // Start them all synchronously, then show the board right away: none of
    // these promises is allowed to hold up the show if a browser stalls.
    const fs = enterFullscreen();
    const lock = wakeLock.enable();
    // Unlock audio on this one tap even if sound is off now, so switching it on
    // later in Control works without anyone touching the TV.
    void unlockAudio();
    // In Safari (before Add to Home Screen) put the link on the clipboard: the
    // installed app has separate storage and can paste it back in one tap.
    if (token && !isStandalone()) void copyText(appUrl(`${trivia ? 'trivia' : 'display'}?t=${token}`));
    setStarted(true);
    if (!trivia) setKickoff(true);
    void fs.then(lockLandscape);
    await Promise.race([lock, new Promise((r) => setTimeout(r, 3000))]);
    setShowStatus(true);
    window.setTimeout(() => setShowStatus(false), 5000);
  }

  let content;
  if (needsLink) content = <LinkScreen onToken={onToken} />;
  else if (!started) content = <StartScreen title={trivia ? '🧠 Trivia Time' : model?.settings.title} onStart={start} />;
  else if (!model) content = <div className="safe start"><div className="start__hint">Loading the scoreboard…</div></div>;
  else if (trivia) content = <TriviaScreen m={model} reduced={reduced} />;
  else if (view === 'end') content = <EndCard m={model} />;
  else if (view === 'bank') content = <TicketBank m={model} />;
  else if (view === 'pickup') content = <TicketBank m={model} pickup />;
  else if (view === 'prizes') content = <PrizeScreen m={model} />;
  else if (view === 'hero') content = <HeroScreen m={model} />;
  else if (view === 'rules') content = <RulesScreen m={model} />;
  else if (view === 'smash') content = <SmashRulesScreen m={model} />;
  else if (view === 'photos') content = <PhotoScreen m={model} />;
  else if (view === 'photo') content = <PhotoScreen m={model} single />;
  else if (view === 'lrc') content = <LrcScreen m={model} />;
  else content = <Board m={model} fx={fx} />;

  return (
    <div className={`display${idle ? ' display--idle' : ''}${fx.shake ? ' display--shake' : ''}`}>
      <div className="starfield" aria-hidden />
      {content}
      {started && model && !trivia && (
        <>
          {view === 'board' && <HypeWord fx={fx} reduced={reduced} />}
          <TicketShower fx={fx} />
          <MomentOverlay m={model} fx={fx} reduced={reduced} />
          <FiveMinuteAlert m={model} reduced={reduced} />
        </>
      )}
      {started && model && <SingOverlay m={model} reduced={reduced} />}
      {kickoff && <Kickoff m={model} reduced={reduced} onDone={endKickoff} />}
      {showStatus && (
        <div className="status-pill">
          {lockMode === 'off' ? '⚠️ Screen may sleep: set Auto-Lock to Never' : '✅ Screen will stay on'}
        </div>
      )}
      {started && offline && <div className="offline-dot" title="Reconnecting" />}
      <div className="rotate-overlay">
        <div className="rotate-overlay__icon">📱↻</div>
        <div>Rotate to landscape</div>
      </div>
    </div>
  );
}

type View = 'board' | 'bank' | 'end' | 'hero' | 'rules' | 'lrc' | 'pickup' | 'prizes' | 'smash' | 'photos' | 'photo';
const ATTRACT: View[] = ['hero', 'board', 'photos', 'bank', 'rules', 'photos', 'smash'];

/** Between-matches photo peek: how long it stays, and how long after a result before it may show. */
const PHOTO_FOR_MS = 10_000;
const PHOTO_QUIET_MS = 20_000;

/**
 * Which screen to show: Control's Ticket Bank switch wins, then the end card,
 * then attract mode (after a quiet minute, cycle hero → board → photos → bank → rules → photos → Smash rules),
 * then the 15 s Ticket Bank peek every 3 minutes, else the board.
 */
function useView(model: BoardModel | null): View {
  const [rotating, setRotating] = useState(false);
  const [lastChange, setLastChange] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const lastEventId = model?.lastEventId;
  const status = model?.status;
  useEffect(() => setLastChange(Date.now()), [lastEventId, status]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const auto = !!model?.settings.autoRotateBank && model.status !== 'finished';
  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => {
      // Only between matches: skip a turn if a result just came in.
      if (Date.now() - lastChange < 20000) return;
      setRotating(true);
      window.setTimeout(() => setRotating(false), BANK_FOR_MS);
    }, BANK_EVERY_MS);
    return () => window.clearInterval(t);
  }, [auto, lastChange]);

  if (!model) return 'board';
  // A screen pinned from Control wins over everything else.
  const pinned = model.settings.tvScreen;
  if (pinned === 'bank' || model.settings.showTicketBank) return 'bank';
  if (pinned === 'pickup') return 'pickup';
  if (pinned === 'prizes') return 'prizes';
  if (pinned === 'smash') return 'smash';
  if (pinned === 'photos') return model.settings.photos.length ? 'photos' : 'board';
  if (pinned === 'thanks') return 'end';
  if (model.settings.lrc && model.settings.lrc.tournamentId === model.tournamentId) return 'lrc';
  // Payout time: cycle the price board, who still needs tickets, and the thanks card.
  if (model.settings.ticketsFrozen) return (['prizes', 'pickup', 'end'] as const)[Math.floor(now / ATTRACT_SLIDE_MS) % 3];
  if (model.status === 'finished') return 'end';
  const quiet = now - lastChange;
  const hasPhotos = model.settings.photos.length > 0;
  if (quiet >= ATTRACT_AFTER_MS && model.status !== 'playoff') {
    const slides = hasPhotos ? ATTRACT : ATTRACT.filter((v) => v !== 'photos');
    return slides[Math.floor((quiet - ATTRACT_AFTER_MS) / ATTRACT_SLIDE_MS) % slides.length];
  }
  if (rotating) return 'bank';
  // A photo for 10 s every few minutes, half a cycle away from the Ticket Bank peek, never right after a result.
  const every = model.settings.photoEveryMinutes * 60_000;
  if (hasPhotos && every > 0 && quiet >= PHOTO_QUIET_MS && (now + every / 2) % every < PHOTO_FOR_MS) return 'photo';
  return 'board';
}

function StartScreen({ title, onStart }: { title?: string; onStart: () => void }) {
  return (
    <div className="start safe">
      <h1 className="start__title">{title ?? "Ethan's Birthday Showdown"}</h1>
      <button className="start__btn" onClick={onStart} autoFocus>
        Tap to start the show
      </button>
      <p className="start__hint">Goes full screen and keeps the screen awake</p>
    </div>
  );
}

function LinkScreen({ onToken }: { onToken: (t: string) => void }) {
  const [text, setText] = useState('');
  return (
    <form
      className="start safe"
      onSubmit={(e) => {
        e.preventDefault();
        const v = text.trim();
        const m = v.match(/[?&]t=([a-z0-9]+)/i);
        if (v) onToken(m ? m[1] : v);
      }}
    >
      <h1 className="start__title start__title--small">Connect this TV</h1>
      <p className="start__hint">
        On your phone: Control → Match → <b>Get the Display link</b>. Open that link here, or paste it (or just the code after
        "t=") below.
      </p>
      <input className="link-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the Display link or code" autoCapitalize="off" autoCorrect="off" />
      <div className="row-center">
        <button className="start__btn start__btn--small">Connect</button>
        <button
          type="button"
          className="start__btn start__btn--small start__btn--alt"
          onClick={async () => {
            try {
              const v = (await navigator.clipboard.readText()).trim();
              const m = v.match(/[?&]t=([a-z0-9]+)/i);
              if (m) onToken(m[1]);
              else setText(v);
            } catch {
              /* paste refused: the text box still works */
            }
          }}
        >
          Paste link
        </button>
      </div>
      <a className="start__hint" href="#/display?sample">
        or preview with sample data
      </a>
    </form>
  );
}
