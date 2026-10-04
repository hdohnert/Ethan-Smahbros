import type { BoardModel } from './model';
import { theme } from '../theme';

/** Between matches: the birthday kid center stage, giant age, neon greeting. */
export function HeroScreen({ m }: { m: BoardModel }) {
  const s = m.settings;
  return (
    <div className="hero-screen safe">
      <div className="hero-screen__balloons" aria-hidden>
        {[theme.colors.pink, theme.colors.blue, theme.colors.lime, theme.colors.gold, theme.colors.pink, theme.colors.blue].map((c, i) => (
          <span key={i} style={{ left: `${8 + i * 16}%`, animationDelay: `${i * 1.3}s`, color: c }}>
            🎈
          </span>
        ))}
      </div>
      <div className="hero-screen__photo-wrap">
        <div className="hero-screen__ring" aria-hidden />
        <div className="hero-screen__photo">
          {s.heroPhotoUrl ? <img src={s.heroPhotoUrl} alt={s.birthdayName} /> : <span className="hero__monogram">{m.monogram}</span>}
        </div>
        <div className="hero-screen__crown" aria-hidden>
          👑
        </div>
        <div className="hero-screen__hat" aria-hidden>
          🎉
        </div>
      </div>
      <div className="hero-screen__text">
        <div className="hero-screen__happy">Happy Birthday,</div>
        <div className="hero-screen__name">{s.birthdayName}!</div>
        {s.age != null && (
          <div className="hero-screen__age">
            <span>{s.age}</span>
            <small>years of awesome</small>
          </div>
        )}
      </div>
    </div>
  );
}
