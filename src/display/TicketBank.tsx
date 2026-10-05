import type { CSSProperties } from 'react';
import { Avatar } from '../ui/Avatar';
import { Header } from './Board';
import type { BoardModel } from './model';

/** Every kid A–Z with their balance, so each finds their own name fast and nobody is "last". */
export function TicketBank({ m, pickup }: { m: BoardModel; pickup?: boolean }) {
  // Pick-up mode: only kids still waiting for their physical tickets.
  const paid = new Set(m.paid);
  const kids = pickup ? m.roster.filter((p) => !paid.has(p.id) && p.tickets > 0) : m.roster;
  const n = kids.length;
  const cols = n <= 8 ? 4 : n <= 15 ? 5 : n <= 24 ? 6 : n <= 35 ? 7 : 8;
  const rows = Math.max(1, Math.ceil(n / cols));
  return (
    <div className="board safe">
      <Header m={{ ...m, phaseLabel: pickup ? '🎟️ Pick up your tickets!' : '🎟️ Ticket Bank' }} />
      {pickup && n === 0 && <div className="bank__done">Everyone has their tickets. Thanks for coming! 🎉</div>}
      <section className="bank" style={{ '--cols': cols, '--rows': rows } as CSSProperties}>
        {kids.map((p) => (
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
