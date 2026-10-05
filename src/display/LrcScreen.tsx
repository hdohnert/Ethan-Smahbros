import type { CSSProperties } from 'react';
import { Avatar } from '../ui/Avatar';
import { Header } from './Board';
import type { BoardModel } from './model';

/** The current Left Right Center round: every table, and each table's winner once known. */
export function LrcScreen({ m }: { m: BoardModel }) {
  const r = m.settings.lrc!;
  const byId = new Map(m.roster.map((p) => [p.id, p]));
  return (
    <div className="board safe">
      <Header m={{ ...m, phaseLabel: `🎲 ${r.name}` }} />
      <section className="lrc" style={{ '--tables': r.tables.length } as CSSProperties}>
        {r.tables.map((table, i) => {
          const w = r.winners[i];
          return (
            <div key={i} className={`lrc__table panel${w ? ' lrc__table--won' : ''}`}>
              <div className="lrc__title">
                Table {i + 1}
                <span className="lrc__pot">🎟️ {table.length * r.ticketsEach}</span>
              </div>
              <ul className="lrc__kids">
                {table.map((id) => {
                  const p = byId.get(id);
                  if (!p) return null;
                  const won = w?.playerId === id;
                  return (
                    <li key={id} className={won ? 'lrc__kid lrc__kid--won' : w ? 'lrc__kid lrc__kid--out' : 'lrc__kid'}>
                      <Avatar player={p} />
                      <span className="lrc__name">{p.name}</span>
                      {won && <span className="lrc__plus">+{w.amount}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
      <div className="lrc__rule">Everyone starts with {r.ticketsEach} tickets. Last one with tickets wins the whole table!</div>
    </div>
  );
}
