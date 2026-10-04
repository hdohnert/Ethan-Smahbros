import type { CSSProperties } from 'react';
import { Avatar } from '../ui/Avatar';
import { Header } from './Board';
import type { BoardModel } from './model';

/** Every kid A–Z with their balance, so each finds their own name fast and nobody is "last". */
export function TicketBank({ m }: { m: BoardModel }) {
  const n = m.roster.length;
  const cols = n <= 8 ? 4 : n <= 15 ? 5 : n <= 24 ? 6 : n <= 35 ? 7 : 8;
  const rows = Math.max(1, Math.ceil(n / cols));
  return (
    <div className="board safe">
      <Header m={{ ...m, phaseLabel: '🎟️ Ticket Bank' }} />
      <section className="bank" style={{ '--cols': cols, '--rows': rows } as CSSProperties}>
        {m.roster.map((p) => (
          <div key={p.id} className="bank__card">
            <Avatar player={p} />
            <span className="bank__name">{p.name}</span>
            <span className="bank__bal">{p.tickets}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
