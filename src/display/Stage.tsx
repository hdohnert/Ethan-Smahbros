import { Avatar } from '../ui/Avatar';
import type { EffectsState } from '../effects/useEffectsEngine';
import type { BoardModel, BoardPlayer } from './model';

export function Stage({ m, fx }: { m: BoardModel; fx?: EffectsState }) {
  const ko = (id?: string) => (id && fx?.flashing.has(id) ? ' fighter--ko' : '');
  const { king, challengers } = m;
  if (m.status === 'setup' || !king || !challengers.length) {
    return (
      <section className="stage stage--waiting panel">
        <div className="stage__wait">{m.status === 'setup' ? 'Get ready to rumble!' : 'Waiting for challengers…'}</div>
      </section>
    );
  }
  const fire = king.streak >= 5 ? 'big' : king.streak >= 3 ? 'on' : 'none';
  const kingClass = `fighter fighter--king${fire !== 'none' ? ' fighter--glow' : ''}${fire === 'big' ? ' fighter--blaze' : ''}${ko(king.id)}`;

  if (challengers.length > 1) {
    // 4-player: the king and the three challengers in a row.
    return (
      <section className="stage stage--many panel">
        <div className={`${kingClass} fighter--card`}>
          <div className="fighter__label">👑 King</div>
          <Avatar player={king} className="avatar--lg" />
          <span className="fighter__name">{king.name}</span>
          <div className="fighter__streak">
            {fire !== 'none' && <span className={`fire fire--${fire}`}>🔥</span>}
            {king.streak} streak
          </div>
          {ko(king.id) && <span className="ko-burst">K.O.!</span>}
        </div>
        {challengers.map((c) => (
          <ChallengerCard key={c.id} p={c} koClass={ko(c.id)} />
        ))}
      </section>
    );
  }

  const challenger = challengers[0];
  return (
    <section className="stage panel">
      <div className={kingClass}>
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

function ChallengerCard({ p, koClass }: { p: BoardPlayer; koClass: string }) {
  return (
    <div className={`fighter fighter--card fighter--challenger-card${koClass}`}>
      <div className="fighter__label fighter__label--blue">Challenger</div>
      <Avatar player={p} className="avatar--lg" />
      <span className="fighter__name">{p.name}</span>
      <div className="fighter__streak">
        {p.wins} {p.wins === 1 ? 'win' : 'wins'}
      </div>
      {koClass && <span className="ko-burst">K.O.!</span>}
    </div>
  );
}
