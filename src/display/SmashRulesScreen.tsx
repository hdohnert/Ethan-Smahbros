import { Header } from './Board';
import type { BoardModel } from './model';
import { activeRuleKeys } from '../data/types';

/** What to set on the Switch, with the rows for right now lit up. */
export function SmashRulesScreen({ m }: { m: BoardModel }) {
  const active = activeRuleKeys(m.status, m.format);
  return (
    <div className="board safe">
      <Header m={{ ...m, phaseLabel: 'Smash Rules' }} />
      <section className="smash-screen">
        {m.settings.smashRules.map((r) => (
          <div key={r.key} className={`panel smash-screen__row${active.includes(r.key) ? ' smash-screen__row--on' : ''}`}>
            <h2>{r.mode}</h2>
            <p>{r.settings}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
