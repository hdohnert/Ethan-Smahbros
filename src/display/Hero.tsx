import type { BoardModel } from './model';
import { theme } from '../theme';

/** The birthday kid's circle-cropped photo with a rotating neon ring, crown and drifting balloons. */
export function Hero({ m }: { m: BoardModel }) {
  const s = m.settings;
  return (
    <div className="hero">
      <div className="hero__balloons" aria-hidden>
        <span style={{ left: '0%', animationDelay: '0s', color: theme.colors.pink }}>🎈</span>
        <span style={{ left: '70%', animationDelay: '2.5s', color: theme.colors.blue }}>🎈</span>
        <span style={{ left: '35%', animationDelay: '5s', color: theme.colors.lime }}>🎈</span>
      </div>
      <div className="hero__ring" aria-hidden />
      <div className="hero__photo">
        {s.heroPhotoUrl ? <img src={s.heroPhotoUrl} alt={s.birthdayName} /> : <span className="hero__monogram">{m.monogram}</span>}
      </div>
      <div className="hero__crown" aria-hidden>
        👑
      </div>
      {s.age != null && <div className="hero__age">{s.age}</div>}
    </div>
  );
}
