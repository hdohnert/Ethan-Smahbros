import { useEffect, useMemo, useState } from 'react';
import { sessionStartMs } from '../data/api';
import type { Live } from '../data/useSnapshot';
import { smashPlayers } from '../data/types';
import { projectBudget, type Projection } from '../rules/budget';

/** Live budget projection for Control; re-evaluates every 30 s as the session clock moves. */
export function useBudget(live: Live): Projection | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const { snap, derived } = live;
  return useMemo(() => {
    if (!snap || !derived) return null;
    const issued = snap.balances.reduce((n, b) => n + (b.earned ?? Math.max(0, b.balance)), 0);
    const kothMatchTimes = snap.events
      .filter((e) => !e.undone && e.kind === 'match' && e.phase === 'koth')
      .map((e) => Date.parse(e.created_at));
    return projectBudget({
      budget: snap.settings.ticketBudget,
      issued,
      d: derived,
      scale: snap.settings.tickets,
      semiBestOf: snap.settings.semiBestOf,
      finalBestOf: snap.settings.finalBestOf,
      activePlayers: smashPlayers(snap).filter((p) => p.active).length,
      sessionMinutes: snap.settings.sessionMinutes,
      sessionStartedAt: sessionStartMs(snap),
      now,
      kothMatchTimes,
    });
  }, [snap, derived, now]);
}

/** Always-visible strip under Control's top bar: issued, left, and the forecast. */
export function BudgetBar({ p, budget, frozen }: { p: Projection; budget: number; frozen: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`budget budget--${p.level}`}>
      <button className="budget__row" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          🎟️ <b>{p.issued}</b> given
        </span>
        <span>
          <b>{p.remaining}</b> left of {budget}
        </span>
        <span>
          ~<b>{p.expectedMore}</b> still to come
        </span>
      </button>
      {frozen && <div className="budget__msg budget__msg--frozen">🔒 Tickets frozen for payout</div>}
      {p.level === 'over' && (
        <div className="budget__msg">
          ⚠️ On track for about {p.expectedTotal}, over {budget}. {p.suggestion}
        </div>
      )}
      {p.level === 'warn' && <div className="budget__msg">Over 90% of tickets given out. Only {p.remaining} left.</div>}
      {open && <BudgetDetails p={p} />}
    </div>
  );
}

export function BudgetDetails({ p }: { p: Projection }) {
  return (
    <ul className="budget__parts">
      {p.parts.map((x) => (
        <li key={x.label}>
          <span>{x.label}</span>
          <b>{x.amount}</b>
        </li>
      ))}
      {p.parts.length === 0 && <li>Nothing more expected from the tournament.</li>}
      <li className="budget__total">
        <span>Expected by the end of the tournament</span>
        <b>{p.expectedTotal}</b>
      </li>
    </ul>
  );
}
