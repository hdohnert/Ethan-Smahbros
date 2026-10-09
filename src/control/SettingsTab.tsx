import { useState } from 'react';
import { TriviaCard } from './TriviaCard';
import { PhotosCard } from './PhotosCard';
import { SmashRulesEditor } from './SmashRules';
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
const EDITABLE = ['title', 'subtitle', 'birthdayName', 'age', 'tickets', 'kingsRest', 'ticketBudget'] as const;
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
      <SessionSettingsCard live={live} />
      <PlayoffLengthCard live={live} />
      <LrcSettingsCard live={live} />
      <SmashRulesEditor live={live} />
      <PhotosCard live={live} />
      <TriviaCard live={live} />

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
        <label className="toggle-row">
          <span>
            <b>Tickets available</b> (physical tickets for the whole night)
          </span>
          <input
            className="num"
            type="number"
            min={0}
            max={100000}
            value={form.ticketBudget}
            onChange={(e) => setForm({ ...form, ticketBudget: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
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

/** Semifinal and final lengths. A series keeps the length it started with. */
function PlayoffLengthCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const { busy, run } = useAction();
  const s = snap.settings;
  const row = (label: string, key: 'semiBestOf' | 'finalBestOf') => (
    <div className="field">
      <span>{label}</span>
      <div className="seg">
        {[1, 3, 5].map((n) => (
          <button
            key={n}
            className={`seg__btn${s[key] === n ? ' seg__btn--on' : ''}`}
            disabled={busy}
            onClick={() => s[key] !== n && run(() => saveSettings(snap, { [key]: n }).then(live.refresh), 'Saved')}
          >
            Best of {n}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <section className="card stack">
      <h2 className="card__title">🏆 Playoff length</h2>
      {row('Semifinals', 'semiBestOf')}
      {row('Final', 'finalBestOf')}
      <p className="muted small">Playoff games are always 1 vs 1. A change only affects series that haven't started yet.</p>
    </section>
  );
}

/** Left Right Center: tickets each player starts with, table size, game name. */
function LrcSettingsCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const s = snap.settings;
  const { busy, run } = useAction();
  const [form, setForm] = useState({ each: s.lrcTicketsEach, size: s.lrcTableSize, name: s.lrcName });
  const dirty = form.each !== s.lrcTicketsEach || form.size !== s.lrcTableSize || form.name !== s.lrcName;
  return (
    <section className="card stack">
      <h2 className="card__title">🎲 Left Right Center</h2>
      <label className="toggle-row">
        <span>Tickets each player starts with</span>
        <input className="num" type="number" min={1} max={20} value={form.each} onChange={(e) => setForm({ ...form, each: Math.max(1, Number(e.target.value) || 1) })} />
      </label>
      <label className="toggle-row">
        <span>Players per table</span>
        <input className="num" type="number" min={2} max={20} value={form.size} onChange={(e) => setForm({ ...form, size: Math.max(2, Number(e.target.value) || 2) })} />
      </label>
      <label className="field">
        <span>Game name (shows on tickets and the TV)</span>
        <input value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      {dirty && (
        <button
          className="btn btn--go"
          disabled={busy}
          onClick={() => run(() => saveSettings(snap, { lrcTicketsEach: form.each, lrcTableSize: form.size, lrcName: form.name.trim() || 'Left Right Center' }).then(live.refresh), 'Saved')}
        >
          Save
        </button>
      )}
      <p className="muted small">Applies to the next round you start.</p>
    </section>
  );
}

/** Main session length, catch-up, and the TV's last-5-minutes alert. */
function SessionSettingsCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const s = snap.settings;
  const { busy, run } = useAction();
  const [mins, setMins] = useState(s.sessionMinutes);
  const save = (patch: Partial<Settings>) => run(() => saveSettings(snap, patch).then(live.refresh), 'Saved');
  return (
    <section className="card stack">
      <h2 className="card__title">⏱ Main session</h2>
      <label className="toggle-row">
        <span>Main session length (minutes)</span>
        <input className="num" type="number" min={10} max={240} value={mins} onChange={(e) => setMins(Math.max(10, Math.min(240, Number(e.target.value) || 10)))} />
      </label>
      {mins !== s.sessionMinutes && (
        <button className="btn btn--go" disabled={busy} onClick={() => save({ sessionMinutes: mins })}>
          Save
        </button>
      )}
      <Toggle label="Catch-up: move kids who've played 2+ fewer games up the line" checked={s.autoCatchUp} onChange={(v) => save({ autoCatchUp: v })} />
      <Toggle label="TV: 5-minutes-left alert and countdown" checked={s.tvFiveMinuteAlert} onChange={(v) => save({ tvFiveMinuteAlert: v })} />
      <p className="muted small">The clock starts with the first match and is shown on the Match tab. The TV only shows it for the last 5 minutes (if on).</p>
    </section>
  );
}
