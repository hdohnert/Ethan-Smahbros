import { useState } from 'react';
import { saveSettings, setFrozen, setPaid, strips } from '../data/api';
import type { TvScreen } from '../data/types';
import type { Live } from '../data/useSnapshot';
import { Avatar } from '../ui/Avatar';
import { Confirm } from '../ui/Confirm';
import { useAction } from '../ui/Toast';

/** End of the night: freeze tickets, then tick each kid off as their physical tickets are handed over. */
export function PayoutCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const s = snap.settings;
  const { busy, run } = useAction();
  const [askUnfreeze, setAskUnfreeze] = useState(false);
  const [askFreeze, setAskFreeze] = useState(false);
  const paid = new Set(snap.paid ?? []);
  const rows = snap.players
    .map((p) => ({ p, balance: Math.max(0, live.balances[p.id] ?? 0), paid: paid.has(p.id) }))
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.p.name.localeCompare(b.p.name));
  const total = rows.reduce((n, r) => n + r.balance, 0);
  const paidTotal = rows.filter((r) => r.paid).reduce((n, r) => n + r.balance, 0);

  return (
    <section className="card stack">
      <h2 className="card__title">💰 Payout</h2>
      {s.ticketsFrozen ? (
        <>
          <div className="frozen-banner">🔒 Tickets frozen for payout. No awards or undos anywhere.</div>
          <div className="payout-totals">
            <div>
              <b>{paidTotal}</b>
              <span>paid</span>
            </div>
            <div>
              <b>{total - paidTotal}</b>
              <span>still to pay</span>
            </div>
            <div>
              <b>{total}</b>
              <span>total (budget {s.ticketBudget})</span>
            </div>
          </div>
          <ul className="payout">
            {rows.map(({ p, balance, paid: isPaid }) => {
              const { strips: st, singles } = strips(balance);
              return (
                <li key={p.id} className={`payout__row${isPaid ? ' payout__row--paid' : ''}`}>
                  <label className="payout__check">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      disabled={busy}
                      onChange={(e) => run(() => setPaid(snap, p.id, e.target.checked).then(live.refresh))}
                    />
                    <Avatar player={p} />
                    <span className="payout__name">{p.name}</span>
                  </label>
                  <span className="payout__amt">
                    <b>{balance}</b>
                    <small>
                      {st
                        ? `${st} strip${st === 1 ? '' : 's'}${singles ? ` + ${singles}` : ''}`
                        : `${singles} single${singles === 1 ? '' : 's'}`}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
          <button className="btn btn--ghost" disabled={busy} onClick={() => setAskUnfreeze(true)}>
            Unfreeze tickets…
          </button>
        </>
      ) : (
        <>
          <p className="muted small">
            When the last game is done, freeze the tickets: balances stop changing everywhere, then hand out physical tickets kid by kid and
            tick them off.
          </p>
          <button className="btn btn--xl btn--gold" disabled={busy} onClick={() => setAskFreeze(true)}>
            🔒 Freeze tickets for payout
          </button>
        </>
      )}
      {askFreeze && (
        <Confirm
          title="Freeze all tickets?"
          confirmLabel="Freeze"
          onCancel={() => setAskFreeze(false)}
          onConfirm={() => {
            setAskFreeze(false);
            void run(() => setFrozen(snap, true).then(live.refresh), 'Tickets frozen. Ready for payout.');
          }}
        >
          <p className="small">No awards or undos from this phone or any station until you unfreeze. The Prize Store still works.</p>
        </Confirm>
      )}
      {askUnfreeze && (
        <Confirm
          title="Unfreeze tickets?"
          confirmLabel="Unfreeze"
          danger
          onCancel={() => setAskUnfreeze(false)}
          onConfirm={() => {
            setAskUnfreeze(false);
            void run(() => setFrozen(snap, false).then(live.refresh), 'Tickets unfrozen');
          }}
        >
          <p className="small">Awards and undos will work again, so balances can change after you've started paying out.</p>
        </Confirm>
      )}
    </section>
  );
}

const SCREENS: { id: TvScreen; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'bank', label: 'Ticket Bank' },
  { id: 'pickup', label: 'Pick up tickets' },
  { id: 'prizes', label: 'Prize Store' },
  { id: 'smash', label: 'Smash rules' },
  { id: 'photos', label: 'Photos' },
  { id: 'thanks', label: 'Thanks card' },
];

/** Pin a screen on the TV, or let it follow the night. */
export function TvScreenCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const s = snap.settings;
  const { busy, run } = useAction();
  const current: TvScreen = s.tvScreen === 'auto' && s.showTicketBank ? 'bank' : s.tvScreen;
  return (
    <section className="card stack">
      <h2 className="card__title">📺 TV screen</h2>
      <div className="seg seg--wrap">
        {SCREENS.map((x) => (
          <button
            key={x.id}
            className={`seg__btn${current === x.id ? ' seg__btn--on' : ''}`}
            disabled={busy}
            onClick={() => run(() => saveSettings(snap, { tvScreen: x.id, showTicketBank: false }).then(live.refresh))}
          >
            {x.label}
          </button>
        ))}
      </div>
      <p className="muted small">Auto shows the scoreboard, bracket, Left Right Center tables and the end card at the right times.</p>
      <label className="toggle-row">
        <span>Auto: show the Ticket Bank for 15 s every 3 min</span>
        <span className="switch">
          <input type="checkbox" checked={s.autoRotateBank} onChange={(e) => run(() => saveSettings(snap, { autoRotateBank: e.target.checked }).then(live.refresh))} />
          <span />
        </span>
      </label>
    </section>
  );
}
