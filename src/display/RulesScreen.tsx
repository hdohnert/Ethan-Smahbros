import { Header } from './Board';
import type { BoardModel } from './model';
import { theme } from '../theme';

export function RulesScreen({ m }: { m: BoardModel }) {
  return (
    <div className="board safe">
      <Header m={{ ...m, phaseLabel: 'How to Play' }} />
      <section className="rules-screen">
        <div className="panel rules-screen__card">
          <h2>👑 King of the Hill</h2>
          <p>{theme.rules.koth}</p>
        </div>
        <div className="panel rules-screen__card">
          <h2>🏆 Top-4 Playoff</h2>
          <p>{theme.rules.playoff}</p>
        </div>
        <div className="panel rules-screen__card">
          <h2>🎟️ Tickets</h2>
          <p>Everyone earns tickets just for playing, more for winning, and at every game station. Spend them at the prize table!</p>
        </div>
      </section>
    </div>
  );
}
