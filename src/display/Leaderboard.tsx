import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Avatar } from '../ui/Avatar';
import { TicketFly } from '../effects/Overlays';
import type { EffectsState } from '../effects/useEffectsEngine';
import { Badges } from './Badges';
import { CountUp } from './CountUp';
import type { BoardPlayer } from './model';

const VISIBLE_ROWS = 8;
const ARROW_MS = 5000;

/** Up to 8 rows; extra rows scroll slowly. Rows slide to new places with an up/down arrow. */
export function Leaderboard({ players, fx }: { players: BoardPlayer[]; fx?: EffectsState }) {
  const overflow = Math.max(0, players.length - VISIBLE_ROWS);
  const moves = useRankMoves(players);
  const style = {
    '--overflow': overflow,
    '--scroll-duration': `${8 + overflow * 2.5}s`,
  } as CSSProperties;

  return (
    <section className="panel leaderboard" style={style}>
      <div className="lb-row lb-row--head">
        <span>#</span>
        <span className="lb-name">Player</span>
        <span>W</span>
        <span>L</span>
        <span>
          <span className="lb-label-long">Streak</span>
          <span className="lb-label-short">🔥</span>
        </span>
        <span>Best</span>
        <span className="lb-col-played">Games</span>
        <span>🎟️</span>
      </div>
      <div className="lb-window">
        <div className={`lb-body${overflow ? ' lb-body--scroll' : ''}`}>
          {players.map((p, i) => {
            const fly = fx?.tickets[p.id];
            return (
              <motion.div
                key={p.id}
                layout="position"
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className={`lb-row${i === 0 ? ' lb-row--first' : ''}${fx?.flashing.has(p.id) ? ' lb-row--ko' : ''}`}
              >
                <span className="lb-rank">
                  {i + 1}
                  {moves[p.id] && <span className={`lb-move lb-move--${moves[p.id]}`}>{moves[p.id] === 'up' ? '▲' : '▼'}</span>}
                </span>
                <span className="lb-name">
                  <Avatar player={p} />
                  <span className="lb-name__text">{p.name}</span>
                  <Badges p={p} />
                </span>
                <span className="lb-wins">
                  <CountUp value={p.wins} />
                </span>
                <span>{p.losses}</span>
                <span className={p.streak >= 3 ? 'lb-hot' : undefined}>
                  {p.streak}
                  {p.streak >= 3 ? '🔥' : ''}
                </span>
                <span>{p.bestStreak}</span>
                <span className="lb-col-played">{p.played}</span>
                <span className="lb-tickets">
                  <CountUp value={p.tickets} />
                </span>
                {fly && <TicketFly key={fly.key} amount={fly.amount} />}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Which players moved up or down since the last change, shown for a few seconds. */
function useRankMoves(players: BoardPlayer[]): Record<string, 'up' | 'down'> {
  const last = useRef<Record<string, number> | null>(null);
  const [moves, setMoves] = useState<Record<string, 'up' | 'down'>>({});
  const order = players.map((p) => p.id).join();
  useEffect(() => {
    const now = Object.fromEntries(players.map((p, i) => [p.id, i]));
    const before = last.current;
    last.current = now;
    if (!before) return;
    const m: Record<string, 'up' | 'down'> = {};
    for (const [id, i] of Object.entries(now)) {
      if (before[id] === undefined) continue;
      if (i < before[id]) m[id] = 'up';
      else if (i > before[id]) m[id] = 'down';
    }
    if (!Object.keys(m).length) return;
    setMoves(m);
    const t = window.setTimeout(() => setMoves({}), ARROW_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);
  return moves;
}
