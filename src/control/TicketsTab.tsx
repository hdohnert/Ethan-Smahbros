import { useState } from 'react';
import { awardEveryone, awardTickets, resetTicketBank, saveSettings, setStationPin, undoTicket } from '../data/api';
import { Confirm } from '../ui/Confirm';
import { BudgetDetails, useBudget } from './Budget';
import { LrcCard } from './LrcCard';
import type { Prize } from '../data/types';
import type { Live } from '../data/useSnapshot';
import { Avatar } from '../ui/Avatar';
import { appUrl, copyText } from '../ui/device';
import { useAction, useToast } from '../ui/Toast';

export function TicketsTab({ live }: { live: Live }) {
  const snap = live.snap!;
  const s = snap.settings;
  const { busy, run } = useAction();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const byName = [...snap.players].sort((a, b) => a.name.localeCompare(b.name));
  const name = (id: string) => snap.players.find((p) => p.id === id)?.name ?? '?';
  const set = (patch: Parameters<typeof saveSettings>[1]) => run(() => saveSettings(snap, patch).then(live.refresh));

  return (
    <div className="stack">
      <BudgetCard live={live} />

      <LrcCard live={live} />

      <section className="card stack">
        <h2 className="card__title">📺 Ticket Bank on the TV</h2>
        <Toggle label="Show Ticket Bank now" checked={s.showTicketBank} onChange={(v) => set({ showTicketBank: v })} />
        <Toggle label="Auto-show for 15 s every 3 min" checked={s.autoRotateBank} onChange={(v) => set({ autoRotateBank: v })} />
      </section>

      <EveryoneCard live={live} />

      <section className="card">
        <h2 className="card__title">Balances</h2>
        <ul className="plist">
          {byName.map((p) => (
            <li key={p.id} className="plist__block">
              <button className="plist__row plist__row--btn" onClick={() => setOpen(open === p.id ? null : p.id)}>
                <span className="plist__who">
                  <Avatar player={p} />
                  <span className="plist__name">{p.name}</span>
                </span>
                <span className="balance">{live.balances[p.id] ?? 0} 🎟️</span>
              </button>
              {open === p.id && (
                <div className="row amounts">
                  {[1, 2, 3, 5].map((n) => (
                    <button
                      key={n}
                      className="btn btn--go"
                      disabled={busy}
                      onClick={() => run(() => awardTickets(snap, p.id, n, 'Bonus from Control').then(live.refresh), `+${n} for ${p.name}`)}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <h2 className="card__title">🎯 Game Stations</h2>
        <p className="muted small">
          Each helper opens the Station link on their phone, enters the PIN, picks their game, then taps a kid and +1/+2/+3/+5.
        </p>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => setStationPin(pin).then(live.refresh).then(() => setPin('')), 'Station PIN saved');
          }}
        >
          <input className="grow" inputMode="numeric" pattern="[0-9]{4,8}" placeholder={snap.has_pin ? 'New PIN (4–8 digits)' : 'Set a PIN (4–8 digits)'} value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="btn btn--go" disabled={busy || !/^[0-9]{4,8}$/.test(pin)}>
            Save PIN
          </button>
        </form>
        <div className="muted small">{snap.has_pin ? '✅ PIN is set. Tell helpers in person; it is not part of the link.' : '⚠️ No PIN yet: stations are locked.'}</div>
        <LinkRow url={appUrl('station')} onCopy={async (u) => toast((await copyText(u)) ? 'Station link copied' : 'Copy failed')} />
      </section>

      <section className="card stack">
        <h2 className="card__title">🎁 Prize Store</h2>
        <Toggle label={s.prizeStoreOpen ? 'Open: kids can spend tickets' : 'Closed'} checked={s.prizeStoreOpen} onChange={(v) => set({ prizeStoreOpen: v })} />
        <PrizeEditor prizes={s.prizes} onSave={(prizes) => set({ prizes })} />
        <LinkRow url={appUrl('prizes')} onCopy={async (u) => toast((await copyText(u)) ? 'Prize Store link copied' : 'Copy failed')} />
        <p className="muted small">Open the Prize Store link here (signed in) or on a helper phone with the station PIN.</p>
      </section>

      <section className="card">
        <h2 className="card__title">Recent tickets</h2>
        <ul className="tlist">
          {snap.recent_tickets.slice(0, 40).map((t) => (
            <li key={t.id} className={`tlist__row${t.undone ? ' tlist__row--undone' : ''}`}>
              <span className={t.amount > 0 ? 'plus' : 'minus'}>
                {t.amount > 0 ? '+' : ''}
                {t.amount}
              </span>
              <span className="grow">
                <b>{name(t.player_id)}</b> <span className="muted small">{t.reason}</span>
              </span>
              {!t.undone && (
                <button className="btn btn--small" disabled={busy} onClick={() => run(() => undoTicket(t.id, snap).then(live.refresh), 'Tickets undone')}>
                  Undo
                </button>
              )}
            </li>
          ))}
          {snap.recent_tickets.length === 0 && <li className="muted">No tickets yet.</li>}
        </ul>
        <p className="muted small">Tournament tickets are undone together with their match by the big Undo button.</p>
      </section>

      <ResetBankCard live={live} />
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}

function LinkRow({ url, onCopy }: { url: string; onCopy: (u: string) => void }) {
  return (
    <div className="row">
      <input className="link-box grow" readOnly value={url} onFocus={(e) => e.target.select()} />
      <button className="btn" onClick={() => onCopy(url)}>
        Copy
      </button>
      <a className="btn" href={url}>
        Open
      </a>
    </div>
  );
}

function PrizeEditor({ prizes, onSave }: { prizes: Prize[]; onSave: (p: Prize[]) => void }) {
  const [rows, setRows] = useState(prizes);
  const dirty = JSON.stringify(rows) !== JSON.stringify(prizes);
  return (
    <div className="stack">
      {rows.map((p, i) => (
        <div key={i} className="row">
          <input className="grow" value={p.name} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
          <input
            className="num"
            type="number"
            min={1}
            value={p.cost}
            onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, cost: Math.max(1, Number(e.target.value) || 1) } : r)))}
          />
          <button className="btn btn--small" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove prize">
            ✕
          </button>
        </div>
      ))}
      <div className="row">
        <button className="btn" onClick={() => setRows([...rows, { name: 'New prize', cost: 10 }])}>
          + Prize
        </button>
        {dirty && (
          <button className="btn btn--go" onClick={() => onSave(rows.filter((r) => r.name.trim()))}>
            Save prizes
          </button>
        )}
      </div>
    </div>
  );
}

/** Give every kid who's here the same bonus (cake time, good sports, cleanup helpers). */
function EveryoneCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const { busy, run } = useAction();
  const [reason, setReason] = useState('Good sports!');
  const [amount, setAmount] = useState<number | null>(null);
  const here = snap.players.filter((p) => p.active);
  return (
    <section className="card stack">
      <h2 className="card__title">🎉 Everyone gets tickets</h2>
      <p className="muted small">A bonus for every kid who's here ({here.length}), so nobody goes home empty-handed.</p>
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={60} placeholder="Reason" />
      <div className="row amounts">
        {[1, 2, 3, 5].map((n) => (
          <button key={n} className="btn btn--go" disabled={busy || !here.length} onClick={() => setAmount(n)}>
            +{n} all
          </button>
        ))}
      </div>
      {amount && (
        <Confirm
          title={<>Give all {here.length} kids +{amount}?</>}
          confirmLabel={`Yes, +${amount} for everyone`}
          onCancel={() => setAmount(null)}
          onConfirm={() => {
            const n = amount;
            setAmount(null);
            void run(
              () => awardEveryone(snap, here.map((p) => p.id), n, reason.trim() || 'Bonus for everyone').then(live.refresh),
              `+${n} for all ${here.length} kids!`,
            );
          }}
        >
          <p className="muted small">Each award shows under Recent tickets and can be undone one by one.</p>
        </Confirm>
      )}
    </section>
  );
}

/** Start the Ticket Bank over at 0 for everyone (for clearing out test tickets). */
function ResetBankCard({ live }: { live: Live }) {
  const [ask, setAsk] = useState(false);
  const { busy, run } = useAction();
  return (
    <section className="card stack">
      <button className="btn btn--ghost btn--danger-text" disabled={busy} onClick={() => setAsk(true)}>
        Reset Ticket Bank (everyone to 0)…
      </button>
      {ask && (
        <Confirm
          title="Reset everyone's tickets to 0?"
          confirmLabel="Reset tickets"
          danger
          onCancel={() => setAsk(false)}
          onConfirm={() => {
            setAsk(false);
            void run(() => resetTicketBank(live.snap!).then(live.refresh), 'Ticket Bank reset: everyone has 0');
          }}
        >
          <p className="small">Good for clearing out test tickets before the party. Players and match scores stay.</p>
        </Confirm>
      )}
    </section>
  );
}

/** The night's ticket budget: given, left, and what the tournament will still pay. */
function BudgetCard({ live }: { live: Live }) {
  const p = useBudget(live);
  const s = live.snap!.settings;
  if (!p) return null;
  return (
    <section className={`card stack budget-card budget-card--${p.level}`}>
      <h2 className="card__title">🎟️ Ticket budget</h2>
      <div className="budget-card__nums">
        <div>
          <b>{p.issued}</b>
          <span>given</span>
        </div>
        <div>
          <b>{p.remaining}</b>
          <span>left of {s.ticketBudget}</span>
        </div>
        <div>
          <b>~{p.expectedMore}</b>
          <span>still to come</span>
        </div>
      </div>
      {p.suggestion && <p className="budget-card__warn">⚠️ {p.suggestion}</p>}
      <BudgetDetails p={p} />
      <p className="muted small">
        No award can ever go past {s.ticketBudget}, from this phone or a helper's. Undo gives tickets back; prizes don't. Change
        "Tickets available" in Settings.
      </p>
    </section>
  );
}
