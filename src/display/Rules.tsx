import { useEffect, useState } from 'react';
import { rulesText } from '../data/types';
import type { MatchFormat } from '../rules/types';

/** Both rules on wide screens; on narrow ones CSS shows only the active one, which rotates. */
export function Rules({ format, semiBestOf, finalBestOf }: { format: MatchFormat; semiBestOf: number; finalBestOf: number }) {
  const text = rulesText(format, semiBestOf, finalBestOf);
  const ITEMS = [
    { label: 'King of the Hill', text: text.koth },
    { label: 'Top-4 Playoff', text: text.playoff },
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setActive((i) => (i + 1) % 2), 9000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <section className="panel rules">
      <h2 className="panel__title">How to Play</h2>
      {ITEMS.map((item, i) => (
        <p key={item.label} className={`rules__item${i === active ? ' rules__item--active' : ''}`}>
          <strong>{item.label}:</strong> {item.text}
        </p>
      ))}
    </section>
  );
}
