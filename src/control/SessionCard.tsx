import { useEffect, useState } from 'react';
import { clockStartMs, kothMatchCount, startSing, stopSing } from '../data/api';
import type { Live } from '../data/useSnapshot';
import { smashPlayers } from '../data/types';
import { fairness } from '../rules/fairness';
import { formatClock, sessionClock } from '../rules/session';
import { Avatar } from '../ui/Avatar';
import { useAction } from '../ui/Toast';
import { useBudget } from './Budget';
import { SING_MS } from '../effects/config';

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

/** Main session clock and match counter (Control only; the TV shows just the last 5 minutes). */
export function SessionCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const d = live.derived!;
  const now = useNow(1000);
  const p = useBudget(live);
  const start = clockStartMs(snap);
  const played = kothMatchCount(snap);
  const minutes = snap.settings.sessionMinutes;

  if (d.status === 'playoff') {
    return (
      <section className="card session">
        <div className="session__row">
          <span>🏁 Main session done</span>
          <b>{played} matches</b>
        </div>
      </section>
    );
  }
  const c = start ? sessionClock(start, minutes, now) : null;
  const expected = played + (p?.remainingMatches ?? 0);
  return (
    <section className={`card session${c ? ` session--${c.phase}` : ''}`}>
      <div className="session__row">
        <span className="session__counter">
          Match <b>{played + 1}</b>
          {expected > played && <> of ~{Math.max(expected, played + 1)}</>}
        </span>
        {c ? (
          <span className="session__clock">
            ⏱ <b>{formatClock(c.elapsedMs)}</b> · {formatClock(c.remainingMs)} left
          </span>
        ) : (
          <span className="muted small">Clock starts with the first match</span>
        )}
      </div>
      {c && (
        <div className="session__bar">
          <span style={{ width: `${Math.min(100, (c.elapsedMs / (minutes * 60_000)) * 100)}%` }} />
        </div>
      )}
      {c?.phase === 'last5' && <div className="session__msg">⏰ Last few matches — start the bracket soon.</div>}
      {c?.phase === 'over' && <div className="session__msg session__msg--over">🏆 Time to start the bracket.</div>}
    </section>
  );
}

/** Games played per kid, with a warning for anyone falling behind. */
export function FairnessCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const d = live.derived!;
  const [open, setOpen] = useState(false);
  const f = fairness(d, smashPlayers(snap));
  const byId = new Map(snap.players.map((p) => [p.id, p]));
  if (!f.rows.length) return null;
  return (
    <section className={`card stack${f.behind.length ? ' fair--warn' : ''}`}>
      <button className="card__title fair__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>⚖️ Games played</span>
        <span className="muted small">
          {f.min}–{f.max} each · avg {f.avg.toFixed(1)} {open ? '▴' : '▾'}
        </span>
      </button>
      {f.behind.length > 0 && (
        <p className="fair__msg">
          ⚠️ Behind: {f.behind.map((r) => `${byId.get(r.id)?.name} (${r.played})`).join(', ')}.{' '}
          {snap.settings.autoCatchUp ? 'Catch-up will move them up the line.' : 'Move them up with ↑ in the line, or turn on catch-up in Settings.'}
        </p>
      )}
      {open && (
        <ul className="fair__list">
          {f.rows.map((r) => {
            const pl = byId.get(r.id);
            return (
              <li key={r.id} className={r.gap >= 2 ? 'fair__row fair__row--behind' : 'fair__row'}>
                {pl && <Avatar player={pl} />}
                <span className="grow">{pl?.name}</span>
                <span className="fair__bar">
                  <span style={{ width: `${f.max ? (r.played / f.max) * 100 : 0}%` }} />
                </span>
                <b>{r.played}</b>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** 🎂 Everybody sing: the TV plays the birthday song screen for everyone. */
export function SingCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const { busy, run } = useAction();
  const now = useNow(1000);
  const singing = !!snap.settings.singAt && now - snap.settings.singAt < SING_MS;
  return (
    <section className="card stack">
      {singing ? (
        <button className="btn btn--xl" disabled={busy} onClick={() => run(() => stopSing(snap).then(live.refresh))}>
          Stop the song screen
        </button>
      ) : (
        <button className="btn btn--xl btn--sing" disabled={busy} onClick={() => run(() => startSing(snap).then(live.refresh), '🎂 Song screen is on the TV')}>
          🎂 Everybody sing!
        </button>
      )}
      <p className="muted small">Shows "Happy Birthday" with the words on the TV for about a minute.</p>
    </section>
  );
}
