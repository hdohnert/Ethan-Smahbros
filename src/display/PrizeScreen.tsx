import type { CSSProperties } from 'react';
import { Header } from './Board';
import type { BoardModel } from './model';

const NEON = ['var(--c-blue)', 'var(--c-lime)', 'var(--c-pink)', 'var(--c-gold)', '#a66bff', '#ff8a3d'];

/** The prize tiers as big neon price tags. */
export function PrizeScreen({ m }: { m: BoardModel }) {
  const prizes = [...m.settings.prizes].sort((a, b) => a.cost - b.cost);
  return (
    <div className="board safe">
      <Header m={{ ...m, phaseLabel: '🎁 Prize Store' }} />
      {/* One row for up to 6 tiers; more than that splits into two even rows. */}
      <section className="prizes" style={{ '--cols': prizes.length <= 6 ? prizes.length : Math.ceil(prizes.length / 2) } as CSSProperties}>
        {prizes.map((p, i) => (
          <div key={p.name} className="prizes__tag" style={{ '--neon': NEON[i % NEON.length], animationDelay: `${i * 0.4}s` } as CSSProperties}>
            <span className="prizes__name">{p.name}</span>
            <span className="prizes__cost">{p.cost}</span>
            <span className="prizes__unit">tickets</span>
          </div>
        ))}
      </section>
      <div className="lrc__rule">Bring your tickets to the prize table!</div>
    </div>
  );
}
