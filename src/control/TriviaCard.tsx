import { useState } from 'react';
import { saveSettings } from '../data/api';
import { DEFAULT_TRIVIA, TRIVIA_CATEGORIES, type TriviaQ } from '../data/trivia';
import type { Live } from '../data/useSnapshot';
import { useAction } from '../ui/Toast';

/** Trivia questions (edit, add, delete) and tickets per right answer. */
export function TriviaCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const s = snap.settings;
  const { busy, run } = useAction();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TriviaQ[]>(s.trivia);
  const dirty = JSON.stringify(rows) !== JSON.stringify(s.trivia);
  const edit = (i: number, patch: Partial<TriviaQ>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = () =>
    run(() => saveSettings(snap, { trivia: rows.filter((r) => r.q.trim() && r.a.trim()) }).then(live.refresh), 'Trivia saved');

  return (
    <section className="card stack">
      <h2 className="card__title">🧠 Trivia</h2>
      <p className="muted small">
        Helpers pick <b>Trivia</b> on the Station page. Each question shows with its answer on their phone, and they can put it on the
        Trivia TV (Match tab → 🧠 Trivia TV link).
      </p>
      <div className="field">
        <span>Tickets for a right answer</span>
        <div className="seg">
          {[1, 2, 3, 5].map((n) => (
            <button
              key={n}
              className={`seg__btn${s.triviaTickets === n ? ' seg__btn--on' : ''}`}
              disabled={busy}
              onClick={() => s.triviaTickets !== n && run(() => saveSettings(snap, { triviaTickets: n }).then(live.refresh), 'Saved')}
            >
              +{n}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Trivia TV photo slideshow when idle</span>
        <div className="seg">
          {[0, 2, 3, 5].map((n) => (
            <button
              key={n}
              className={`seg__btn${s.triviaSlideshowMinutes === n ? ' seg__btn--on' : ''}`}
              disabled={busy}
              onClick={() => s.triviaSlideshowMinutes !== n && run(() => saveSettings(snap, { triviaSlideshowMinutes: n }).then(live.refresh), 'Saved')}
            >
              {n ? `After ${n} min` : 'Off'}
            </button>
          ))}
        </div>
        <p className="muted small">Uses the photos from Photos on the TV. A question from a helper interrupts it right away.</p>
      </div>

      <button className="btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? 'Hide questions' : `Edit questions (${s.trivia.length})`}
      </button>
      {open && (
        <div className="stack">
          {rows.map((r, i) => (
            <div key={r.id} className="stack trivia-edit">
              <div className="row">
                <select value={r.cat} onChange={(e) => edit(i, { cat: e.target.value })} className="grow">
                  {[...new Set([...TRIVIA_CATEGORIES, r.cat])].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button className="btn btn--small" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Delete question">
                  ✕
                </button>
              </div>
              <input value={r.q} maxLength={140} placeholder="Question" onChange={(e) => edit(i, { q: e.target.value })} />
              <input value={r.a} maxLength={80} placeholder="Answer" onChange={(e) => edit(i, { a: e.target.value })} />
            </div>
          ))}
          <div className="row">
            <button
              className="btn"
              onClick={() => setRows([...rows, { id: `c${Date.now().toString(36)}`, cat: TRIVIA_CATEGORIES[0], q: '', a: '' }])}
            >
              + Question
            </button>
            <button className="btn btn--ghost" onClick={() => setRows(DEFAULT_TRIVIA)}>
              Reset to defaults
            </button>
          </div>
        </div>
      )}
      {dirty && (
        <button className="btn btn--go" disabled={busy} onClick={save}>
          Save questions
        </button>
      )}
    </section>
  );
}
