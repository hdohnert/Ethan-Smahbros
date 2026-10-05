import { useState } from 'react';
import { saveSettings, setMatchFormat, uploadPhoto } from '../data/api';
import { supabase } from '../data/supabase';
import type { Settings } from '../data/types';
import type { Live } from '../data/useSnapshot';
import type { MatchFormat, TicketScale } from '../rules/types';
import { PhotoCropper } from '../ui/PhotoCropper';
import { useAction } from '../ui/Toast';
import { Toggle } from './TicketsTab';

const SCALE_LABELS: [keyof TicketScale, string][] = [
  ['play', 'Play a match'],
  ['win', 'Win a match (extra)'],
  ['streak3', '3-win streak bonus'],
  ['streak5', '5-win streak bonus'],
  ['giantSlayer', 'Giant Slayer bonus'],
  ['top4', 'Make the Top 4'],
  ['final', 'Reach the final'],
  ['champion', 'Champion'],
];

// Only these fields are edited by the form, so saving never overwrites
// toggles or photo links that changed elsewhere in the meantime.
const EDITABLE = ['title', 'subtitle', 'birthdayName', 'age', 'tickets', 'kingsRest'] as const;
type Editable = Pick<Settings, (typeof EDITABLE)[number]>;
const pickEditable = (s: Settings): Editable =>
  Object.fromEntries(EDITABLE.map((k) => [k, s[k]])) as unknown as Editable;

export function SettingsTab({ live, email }: { live: Live; email: string }) {
  const snap = live.snap!;
  const { busy, run } = useAction();
  const [form, setForm] = useState<Editable>(() => pickEditable(snap.settings));
  const [file, setFile] = useState<File | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(pickEditable(snap.settings));
  const save = (patch: Partial<Settings>) => run(() => saveSettings(snap, patch).then(live.refresh), 'Saved');
  const text = (key: 'title' | 'subtitle' | 'birthdayName', label: string) => (
    <label className="field">
      <span>{label}</span>
      <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} maxLength={60} />
    </label>
  );

  if (file) {
    return (
      <PhotoCropper
        file={file}
        onCancel={() => setFile(null)}
        onDone={(blob) => {
          setFile(null);
          void run(async () => {
            const { path, url, expires } = await uploadPhoto(blob, 'hero');
            await saveSettings(snap, { heroPhotoPath: path, heroPhotoUrl: url, heroPhotoExpires: expires });
            await live.refresh();
          }, 'Photo saved');
        }}
      />
    );
  }

  return (
    <div className="stack">
      <FormatCard live={live} />

      <section className="card stack">
        <h2 className="card__title">🎂 Birthday</h2>
        {text('title', 'Title')}
        {text('subtitle', 'Subtitle')}
        {text('birthdayName', 'Birthday kid (default starting king)')}
        <label className="field">
          <span>New age</span>
          <input
            type="number"
            min={1}
            max={120}
            value={form.age ?? ''}
            onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })}
          />
        </label>
        <div className="row">
          {snap.settings.heroPhotoUrl && <img className="hero-thumb" src={snap.settings.heroPhotoUrl} alt="" />}
          <label className="btn grow">
            📷 {snap.settings.heroPhotoUrl ? 'Change' : 'Upload'} {snap.settings.birthdayName}'s photo
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
          </label>
        </div>
        <p className="muted small">Photos are stored privately in Supabase, never in the GitHub repo.</p>
      </section>

      <section className="card stack">
        <h2 className="card__title">🎟️ Ticket scale</h2>
        {SCALE_LABELS.map(([key, label]) => (
          <label key={key} className="toggle-row">
            <span>{label}</span>
            <input
              className="num"
              type="number"
              min={0}
              max={100}
              value={form.tickets[key]}
              onChange={(e) => setForm({ ...form, tickets: { ...form.tickets, [key]: Math.max(0, Number(e.target.value) || 0) } })}
            />
          </label>
        ))}
        <Toggle
          label="King's rest: after 5 straight wins the king goes to the back of the line"
          checked={form.kingsRest}
          onChange={(v) => setForm({ ...form, kingsRest: v })}
        />
        <p className="muted small">Changes apply to results from now on; tickets already paid stay as they are.</p>
      </section>

      <section className="card stack">
        <h2 className="card__title">🔊 TV sound</h2>
        <Toggle
          label="Sound effects on the TV (KO, New King, Champion)"
          checked={snap.settings.sound}
          onChange={(v) => run(() => saveSettings(snap, { sound: v }).then(live.refresh), v ? 'Sound on' : 'Sound off')}
        />
        <p className="muted small">Plays through the TV when mirroring. The TV must have been started with its big start button.</p>
      </section>

      {dirty && (
        <button className="btn btn--xl btn--go sticky-save" disabled={busy} onClick={() => save(form)}>
          Save settings
        </button>
      )}

      <section className="card stack">
        <h2 className="card__title">Account</h2>
        <div className="muted small">Signed in as {email}</div>
        <button className="btn btn--ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </section>
    </div>
  );
}

/** 1v1 or 4-player. During King of the Hill a switch is an Undo step. */
function FormatCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const d = live.derived!;
  const { busy, run } = useAction();
  const playoff = d.status === 'playoff' || d.status === 'finished';
  const choose = (f: MatchFormat) => {
    if (f === d.format) return;
    void run(
      () => setMatchFormat(snap, d, f).then(live.refresh),
      d.status === 'koth' ? `Switched to ${f}. Undo switches back.` : `Matches will be ${f}`,
    );
  };
  return (
    <section className="card stack">
      <h2 className="card__title">🎮 Match format</h2>
      <div className="seg">
        {(['4-player', '1v1'] as const).map((f) => (
          <button key={f} className={`seg__btn${d.format === f ? ' seg__btn--on' : ''}`} disabled={busy || playoff} onClick={() => choose(f)}>
            {f === '4-player' ? '4-player' : '1 vs 1'}
          </button>
        ))}
      </div>
      <p className="muted small">
        {playoff
          ? 'Playoff games are always 1 vs 1.'
          : '4-player: the king plays the next 3 in line, the winner stays king. Switch only between matches; Undo can switch it back.'}
      </p>
    </section>
  );
}
