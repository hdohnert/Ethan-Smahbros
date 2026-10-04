import { Avatar } from '../ui/Avatar';
import type { EffectsState } from '../effects/useEffectsEngine';
import type { BoardModel } from './model';

export function Stage({ m, fx }: { m: BoardModel; fx?: EffectsState }) {
  const ko = (id?: string) => (id && fx?.flashing.has(id) ? ' fighter--ko' : '');
  const { king, challenger } = m;
  if (m.status === 'setup' || !king || !challenger) {
    return (
      <section className="stage stage--waiting panel">
        <div className="stage__wait">{m.status === 'setup' ? 'Get ready to rumble!' : 'Waiting for challengers…'}</div>
      </section>
    );
  }
  const fire = king.streak >= 5 ? 'big' : king.streak >= 3 ? 'on' : 'none';
  return (
    <section className="stage panel">
      <div className={`fighter fighter--king${fire !== 'none' ? ' fighter--glow' : ''}${fire === 'big' ? ' fighter--blaze' : ''}${ko(king.id)}`}>
        <div className="fighter__label">👑 King</div>
        <div className="fighter__row">
          <Avatar player={king} className="avatar--lg" />
          <span className="fighter__name">{king.name}</span>
        </div>
        {ko(king.id) && <span className="ko-burst">K.O.!</span>}
        <div className="fighter__streak">
          {fire !== 'none' && <span className={`fire fire--${fire}`}>🔥</span>}
          {king.streak} win streak
        </div>
      </div>
      <div className="stage__vs">VS</div>
      <div className={`fighter fighter--challenger${ko(challenger.id)}`}>
        <div className="fighter__label">Challenger</div>
        <div className="fighter__row">
          <Avatar player={challenger} className="avatar--lg" />
          <span className="fighter__name">{challenger.name}</span>
        </div>
        <div className="fighter__streak">
          {challenger.wins} {challenger.wins === 1 ? 'win' : 'wins'} tonight
        </div>
      </div>
    </section>
  );
}
