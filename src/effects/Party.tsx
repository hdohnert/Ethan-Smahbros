// TV screens driven by the clock or by Control rather than by a match result:
// the birthday song and the last-5-minutes alert.

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { BoardModel } from '../display/model';
import { formatClock, sessionClock, type ClockPhase } from '../rules/session';

/** Header pill text for the last 5 minutes ("⏰ 4:32 left"), else null. */
export function useLastMinutes(m: BoardModel): { text: string; over: boolean } | null {
  const now = useNow(1000);
  if (!m.settings.tvFiveMinuteAlert || m.status !== 'koth' || m.clockStart == null) return null;
  const c = sessionClock(m.clockStart, m.settings.sessionMinutes, now);
  if (c.phase === 'running') return null;
  return c.phase === 'over' ? { text: '⏰ Playoffs next!', over: true } : { text: `⏰ ${formatClock(c.remainingMs)} left`, over: false };
}
import { SING_MS } from './config';
import { burst, cannons } from './confetti';
import { BIRTHDAY_BEAT, BIRTHDAY_LINES, playBirthday } from './sound';

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

const LEAD_MS = 3000;
const LINE_MS = BIRTHDAY_LINES.map((l) => l.reduce((n, [, b]) => n + b, 0) * BIRTHDAY_BEAT * 1000);
const SONG_MS = LINE_MS.reduce((a, b) => a + b, 0);

/** 🎂 Everybody sing: words light up line by line (with the tune if sound is on). */
export function SingOverlay({ m, reduced }: { m: BoardModel; reduced: boolean }) {
  const singAt = m.settings.singAt;
  const now = useNow(200);
  // Time the song from when this TV first saw the button press (phone and TV clocks can differ).
  const [seen, setSeen] = useState<{ at: number; local: number } | null>(null);
  const active = !!singAt && Date.now() - singAt < SING_MS;
  useEffect(() => {
    if (!active || !singAt || seen?.at === singAt) return;
    setSeen({ at: singAt, local: Date.now() });
    if (m.settings.sound) playBirthday(LEAD_MS / 1000);
    cannons(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, singAt]);
  const t = seen && seen.at === singAt ? now - seen.local - LEAD_MS : -LEAD_MS;
  const done = t >= SONG_MS;
  const fired = useRef(false);
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      cannons(true);
      window.setTimeout(() => burst({ gold: true, count: 120, y: 0.4 }), 900);
    }
    if (!done) fired.current = false;
  }, [done]);
  if (!active) return null;

  const name = m.settings.birthdayName || 'Ethan';
  const lines = ['Happy birthday to you', 'Happy birthday to you', `Happy birthday dear ${name}`, 'Happy birthday to you!'];
  let line = -1;
  for (let i = 0, start = 0; i < LINE_MS.length; start += LINE_MS[i], i++) if (t >= start && t < start + LINE_MS[i]) line = i;
  const count = t < 0 ? Math.min(3, Math.ceil(-t / 1000)) : 0;
  const candles = Math.max(1, Math.min(12, m.settings.age || 1));

  return (
    <div className={`sing${reduced ? ' sing--calm' : ''}`}>
      <div className="sing__cake" aria-hidden>
        <div className="sing__candles">
          {Array.from({ length: candles }, (_, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.13}s` }}>
              🕯️
            </span>
          ))}
        </div>
        🎂
      </div>
      {t < 0 ? (
        <>
          <div className="sing__title">Everybody sing!</div>
          <motion.div key={count} className="sing__count" initial={reduced ? { opacity: 0 } : { scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {count}
          </motion.div>
        </>
      ) : done ? (
        <motion.div className="sing__title sing__title--done" initial={reduced ? { opacity: 0 } : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          🎉 Make a wish, {name}! 🎉
        </motion.div>
      ) : (
        <ol className="sing__lines">
          {lines.map((l, i) => (
            <li key={i} className={i === line ? 'sing__line sing__line--on' : i < line ? 'sing__line sing__line--sung' : 'sing__line'}>
              {l}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Last 5 minutes of the main session: a big alert once, then a small corner countdown. */
export function FiveMinuteAlert({ m, reduced }: { m: BoardModel; reduced: boolean }) {
  const now = useNow(1000);
  const on = m.settings.tvFiveMinuteAlert && m.status === 'koth' && m.clockStart != null;
  const c = on ? sessionClock(m.clockStart!, m.settings.sessionMinutes, now) : null;
  const phase: ClockPhase | null = c?.phase ?? null;
  const last = useRef<ClockPhase | null>(null);
  const [banner, setBanner] = useState(false);
  useEffect(() => {
    // Only on the moment it crosses into the last 5 minutes, not when the TV loads late.
    if (last.current === 'running' && phase === 'last5') {
      setBanner(true);
      burst({ count: 50, y: 0.4 });
      window.setTimeout(() => setBanner(false), 4500);
    }
    last.current = phase;
  }, [phase]);
  if (!c || c.phase === 'running') return null;
  return (
    <>
      <AnimatePresence>
        {banner && (
          <motion.div className="moment moment--alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="slam"
              initial={reduced ? { opacity: 0 } : { scale: 3, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              <div className="slam__kicker slam__kicker--flash">⏰ 5 MINUTES LEFT! ⏰</div>
              <div className="slam__name">Last few matches!</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
