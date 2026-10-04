import type { BoardPlayer } from './model';

/** On Fire (3 in a row), Unstoppable (5), Giant Slayer, Former King. Cosmetic only. */
export function Badges({ p }: { p: BoardPlayer }) {
  const out: [string, string][] = [];
  if (p.streak >= 5) out.push(['⚡', 'Unstoppable']);
  else if (p.streak >= 3) out.push(['🔥', 'On Fire']);
  if (p.giantSlayer > 0) out.push(['🗡️', 'Giant Slayer']);
  if (p.formerKing) out.push(['👑', 'Former King']);
  if (!out.length) return null;
  return (
    <span className="badges">
      {out.map(([icon, label]) => (
        <span key={label} className="badge" title={label}>
          {icon}
        </span>
      ))}
    </span>
  );
}
