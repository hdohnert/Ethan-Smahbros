import type { BoardPlayer } from './sampleData';
import { Avatar } from './Board';

export function Stage({ king, challenger }: { king: BoardPlayer; challenger: BoardPlayer }) {
  const fire = king.streak >= 5 ? 'big' : king.streak >= 3 ? 'on' : 'none';
  return (
    <section className="stage panel">
      <div className={`fighter fighter--king${fire !== 'none' ? ' fighter--glow' : ''}`}>
        <div className="fighter__label">👑 King</div>
        <div className="fighter__row">
          <Avatar player={king} size="lg" />
          <span className="fighter__name">{king.name}</span>
        </div>
        <div className="fighter__streak">
          {fire !== 'none' && <span className={`fire fire--${fire}`}>🔥</span>}
          {king.streak} win streak
        </div>
      </div>
      <div className="stage__vs">VS</div>
      <div className="fighter fighter--challenger">
        <div className="fighter__label">Challenger</div>
        <div className="fighter__row">
          <Avatar player={challenger} size="lg" />
          <span className="fighter__name">{challenger.name}</span>
        </div>
        <div className="fighter__streak">{challenger.wins} wins tonight</div>
      </div>
    </section>
  );
}
