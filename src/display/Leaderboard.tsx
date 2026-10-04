import type { CSSProperties } from 'react';
import type { BoardPlayer } from './sampleData';
import { Avatar } from './Board';

const VISIBLE_ROWS = 8;

/** Up to 8 rows; any extra rows scroll slowly up and back down. */
export function Leaderboard({ players }: { players: BoardPlayer[] }) {
  const overflow = Math.max(0, players.length - VISIBLE_ROWS);
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
          {players.map((p, i) => (
            <div key={p.id} className={`lb-row${i === 0 ? ' lb-row--first' : ''}`}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">
                <Avatar player={p} />
                <span className="lb-name__text">{p.name}</span>
              </span>
              <span className="lb-wins">{p.wins}</span>
              <span>{p.losses}</span>
              <span className={p.streak >= 3 ? 'lb-hot' : undefined}>
                {p.streak}
                {p.streak >= 3 ? '🔥' : ''}
              </span>
              <span>{p.bestStreak}</span>
              <span className="lb-col-played">{p.played}</span>
              <span className="lb-tickets">{p.tickets}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
