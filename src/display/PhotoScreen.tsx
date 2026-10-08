import { useEffect, useState } from 'react';
import type { BoardModel } from './model';

export const PHOTO_MS = 8000;

/** Which photo is up: time-based, so it keeps moving without any saved state. */
export const photoIndex = (n: number, now: number, ms = PHOTO_MS) => (n ? Math.floor(now / ms) % n : 0);

/**
 * Full-screen photo with a slow zoom and pan (Ken Burns), a soft blurred
 * copy behind it so tall and wide photos both fill the TV, and the caption.
 * `single` holds one photo (the between-matches peek); otherwise it cycles.
 */
export function PhotoScreen({ m, single }: { m: BoardModel; single?: boolean }) {
  const photos = m.settings.photos;
  const [now, setNow] = useState(() => Date.now());
  // A peek shows the next photo each time (one step per peek cycle).
  const [first] = useState(() => photoIndex(photos.length, Date.now(), Math.max(1, m.settings.photoEveryMinutes) * 60_000));
  useEffect(() => {
    if (single) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [single]);
  const i = single ? first : photoIndex(photos.length, now);
  const p = photos[i];

  // Warm the next photo so it appears without a blank moment.
  const next = photos[(i + 1) % Math.max(1, photos.length)];
  useEffect(() => {
    if (next) new Image().src = next.url;
  }, [next]);

  if (!p) return null;
  return (
    <div className="photo-screen">
      <img key={`bg${i}`} className="photo-screen__bg" src={p.url} alt="" aria-hidden />
      <img key={`fg${i}`} className={`photo-screen__img photo-screen__img--${i % 4}`} src={p.url} alt={p.caption} />
      {p.caption && <div className="photo-screen__caption">{p.caption}</div>}
    </div>
  );
}
