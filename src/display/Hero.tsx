import { theme } from '../theme';

/** Ethan's circle-cropped photo with a rotating neon ring, crown and drifting balloons. */
export function Hero() {
  return (
    <div className="hero">
      <div className="hero__balloons" aria-hidden>
        <span style={{ left: '0%', animationDelay: '0s', color: theme.colors.pink }}>🎈</span>
        <span style={{ left: '70%', animationDelay: '2.5s', color: theme.colors.blue }}>🎈</span>
        <span style={{ left: '35%', animationDelay: '5s', color: theme.colors.lime }}>🎈</span>
      </div>
      <div className="hero__ring" aria-hidden />
      <div className="hero__photo">
        {theme.heroPhotoUrl ? (
          <img src={theme.heroPhotoUrl} alt={theme.birthdayName} />
        ) : (
          <span className="hero__monogram">{theme.monogram}</span>
        )}
      </div>
      <div className="hero__crown" aria-hidden>
        👑
      </div>
      <div className="hero__age">{theme.age}</div>
    </div>
  );
}
