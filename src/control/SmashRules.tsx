import { useEffect, useRef, useState } from 'react';
import { saveSettings } from '../data/api';
import { DEFAULT_SMASH_RULES, activeRuleKeys, type SmashRule } from '../data/types';

export { activeRuleKeys };
import type { Live } from '../data/useSnapshot';
import { useAction } from '../ui/Toast';

export function SmashRulesList({ rules, active }: { rules: SmashRule[]; active: SmashRule['key'][] }) {
  return (
    <ul className="smash-rules">
      {rules.map((r) => (
        <li key={r.key} className={`smash-rules__row${active.includes(r.key) ? ' smash-rules__row--on' : ''}`}>
          <b>{r.mode}</b>
          <span>{r.settings}</span>
        </li>
      ))}
    </ul>
  );
}

/** Match tab card: what to set on the Switch, with the rows for right now highlighted. */
export function SmashRulesCard({ live }: { live: Live }) {
  const s = live.snap!.settings;
  const d = live.derived!;
  return (
    <section className="card stack">
      <h2 className="card__title">🎮 Smash rules to set</h2>
      <SmashRulesList rules={s.smashRules} active={activeRuleKeys(d.status, d.format)} />
      <p className="muted small">Highlighted rows are what the Switch should be set to now. Edit the text in Settings.</p>
    </section>
  );
}

/** Settings: edit the text of each row. */
export function SmashRulesEditor({ live }: { live: Live }) {
  const snap = live.snap!;
  const { busy, run } = useAction();
  const [rows, setRows] = useState(snap.settings.smashRules);
  const dirty = JSON.stringify(rows) !== JSON.stringify(snap.settings.smashRules);
  const edit = (i: number, patch: Partial<SmashRule>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <section className="card stack">
      <h2 className="card__title">🎮 Smash rules to set</h2>
      {rows.map((r, i) => (
        <div key={r.key} className="stack smash-edit">
          <input value={r.mode} maxLength={40} onChange={(e) => edit(i, { mode: e.target.value })} aria-label="Mode" />
          <input value={r.settings} maxLength={100} onChange={(e) => edit(i, { settings: e.target.value })} aria-label="Settings" />
        </div>
      ))}
      <div className="row">
        {dirty && (
          <button className="btn btn--go" disabled={busy} onClick={() => run(() => saveSettings(snap, { smashRules: rows }).then(live.refresh), 'Saved')}>
            Save
          </button>
        )}
        <button className="btn btn--ghost" disabled={busy} onClick={() => setRows(DEFAULT_SMASH_RULES)}>
          Reset to defaults
        </button>
      </div>
      <p className="muted small">Shows on the Match tab, pops up when the format changes or the bracket starts, and appears on the TV.</p>
    </section>
  );
}

/**
 * True once the King of the Hill format changes or the bracket starts while
 * Control is open (not on first load), so the reminder sheet can pop up.
 */
export function useSmashReminder(live: Live): [boolean, () => void] {
  const d = live.derived;
  const tid = live.snap?.tournament?.id;
  const key = d ? `${d.status === 'playoff' ? 'playoff' : d.format}` : null;
  const prev = useRef<{ tid?: string; key: string | null } | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!key) return;
    const p = prev.current;
    prev.current = { tid, key };
    if (!p || p.tid !== tid || p.key === key) return;
    if (d?.status === 'koth' || d?.status === 'playoff') setShow(true);
  }, [tid, key, d?.status]);
  return [show, () => setShow(false)];
}
