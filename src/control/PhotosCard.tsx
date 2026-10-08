import { useEffect, useState } from 'react';
import { deleteSlideFiles, saveSettings, uploadSlides } from '../data/api';
import type { SlidePhoto } from '../data/types';
import type { Live } from '../data/useSnapshot';
import { useAction, useToast } from '../ui/Toast';

export const MAX_PHOTOS = 60;
const EVERY = [0, 2, 3, 5];

/** Slideshow photos for the TV: upload many at once, caption, reorder, delete. */
export function PhotosCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const s = snap.settings;
  const { busy, run } = useAction();
  const toast = useToast();
  const [rows, setRows] = useState<SlidePhoto[]>(s.photos);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const saved = JSON.stringify(s.photos);
  // Pick up changes saved elsewhere (or link refreshes) when nothing is being edited here.
  const [base, setBase] = useState(saved);
  useEffect(() => {
    if (saved !== base) {
      setRows(s.photos);
      setBase(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  const dirty = JSON.stringify(rows) !== saved;

  const save = (photos: SlidePhoto[], msg = 'Photos saved') => run(() => saveSettings(snap, { photos }).then(live.refresh), msg);

  async function add(list: FileList | null) {
    const files = [...(list ?? [])].slice(0, Math.max(0, MAX_PHOTOS - rows.length));
    if (!files.length) {
      if (list?.length) toast(`That's the limit of ${MAX_PHOTOS} photos`, 'error');
      return;
    }
    setProgress({ done: 0, total: files.length });
    try {
      const { slides, failed } = await uploadSlides(files, (done) => setProgress({ done, total: files.length }));
      const photos = [...rows, ...slides];
      setRows(photos);
      await save(photos, `Added ${slides.length} photo${slides.length === 1 ? '' : 's'}${failed ? ` · ${failed} couldn't be read` : ''}`);
    } finally {
      setProgress(null);
    }
  }

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };

  const remove = (i: number) => {
    const gone = rows[i];
    const photos = rows.filter((_, j) => j !== i);
    setRows(photos);
    void save(photos, 'Photo removed').then(() => deleteSlideFiles([gone.path]).catch(() => {}));
  };

  return (
    <section className="card stack">
      <h2 className="card__title">🖼️ Photos on the TV</h2>
      <p className="muted small">
        Shown between matches, when things are quiet, or all the time if you pick Photos in the TV screen picker. {rows.length} of {MAX_PHOTOS}.
      </p>

      <label className={`btn btn--go${busy || progress ? ' btn--disabled' : ''}`}>
        {progress ? `Uploading ${progress.done} of ${progress.total}…` : '📷 Add photos'}
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={busy || !!progress}
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {rows.length > 0 && (
        <ul className="slides">
          {rows.map((p, i) => (
            <li key={p.path} className="slides__row">
              <img className="slides__thumb" src={p.url} alt="" loading="lazy" />
              <input
                className="grow"
                value={p.caption}
                maxLength={60}
                placeholder="Caption (optional)"
                onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, caption: e.target.value } : r)))}
              />
              <div className="slides__btns">
                <button className="btn btn--small" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  ↑
                </button>
                <button className="btn btn--small" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  ↓
                </button>
                <button className="btn btn--small" disabled={busy} onClick={() => remove(i)} aria-label="Remove photo">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dirty && (
        <button className="btn btn--go" disabled={busy} onClick={() => void save(rows)}>
          Save captions and order
        </button>
      )}

      <div className="field">
        <span>Show a photo between matches</span>
        <div className="seg">
          {EVERY.map((n) => (
            <button
              key={n}
              className={`seg__btn${s.photoEveryMinutes === n ? ' seg__btn--on' : ''}`}
              disabled={busy}
              onClick={() => s.photoEveryMinutes !== n && run(() => saveSettings(snap, { photoEveryMinutes: n }).then(live.refresh), 'Saved')}
            >
              {n ? `Every ${n} min` : 'Off'}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
