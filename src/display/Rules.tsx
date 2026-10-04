import { useEffect, useState } from 'react';
import { theme } from '../theme';

const ITEMS = [
  { label: 'King of the Hill', text: theme.rules.koth },
  { label: 'Top-4 Playoff', text: theme.rules.playoff },
];

/** Both rules on wide screens; on narrow ones CSS shows only the active one, which rotates. */
export function Rules() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setActive((i) => (i + 1) % ITEMS.length), 9000);
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
