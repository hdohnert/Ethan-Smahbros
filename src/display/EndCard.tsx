import { Avatar } from '../ui/Avatar';
import type { BoardModel } from './model';

/** Final screen to take a picture of: the birthday kid, the champion and the top ticket earners. */
export function EndCard({ m }: { m: BoardModel }) {
  const s = m.settings;
  const champ = m.champion;
  const birthdayChamp = champ && champ.name.toLowerCase() === s.birthdayName.toLowerCase();
  const top = [...m.roster].sort((a, b) => b.earned - a.earned).filter((p) => p.earned > 0).slice(0, 5);
  return (
    <div className="endcard safe">
      <div className="endcard__hero">
        <div className="endcard__photo">
          {s.heroPhotoUrl ? <img src={s.heroPhotoUrl} alt="" /> : <span className="hero__monogram">{m.monogram}</span>}
        </div>
        <div className="endcard__thanks">Thanks for coming!</div>
        <div className="endcard__title">{s.title}</div>
      </div>
      <div className="endcard__info">
        {champ && (
          <div className="endcard__champ">
            <div className="endcard__label">{birthdayChamp ? '🎂 Birthday Champion 🎂' : '🏆 Champion 🏆'}</div>
            <div className="endcard__champrow">
              <Avatar player={champ} className="avatar--lg" />
              <span>{champ.name}</span>
            </div>
            {!birthdayChamp && <div className="endcard__at">at {s.title}</div>}
          </div>
        )}
        {top.length > 0 && (
          <div className="endcard__top">
            <div className="endcard__label">🎟️ Top ticket earners</div>
            <ol>
              {top.map((p) => (
                <li key={p.id}>
                  <Avatar player={p} />
                  <span className="grow">{p.name}</span>
                  <b>{p.earned}</b>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
