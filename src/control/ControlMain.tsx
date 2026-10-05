import { useEffect, useRef, useState } from 'react';
import { newTournament, refreshPhotoLinks, saveSettings, undoLast, demoStep } from '../data/api';
import { DEFAULT_TICKETS, TICKET_SCALE_VERSION } from '../rules/tickets';
import { DEFAULT_PRIZES, PRIZES_VERSION } from '../data/types';
import { useSnapshot } from '../data/useSnapshot';
import type { Snapshot } from '../data/types';
import { useAction } from '../ui/Toast';
import { describeEvent } from './describe';
import { BudgetBar, useBudget } from './Budget';
import { MatchTab } from './MatchTab';
import { PlayersTab } from './PlayersTab';
import { SettingsTab } from './SettingsTab';
import { TicketsTab } from './TicketsTab';
import { SmashRulesList, activeRuleKeys, useSmashReminder } from './SmashRules';
import { Sheet } from '../ui/Confirm';

const TABS = [
  { id: 'match', label: 'Match', icon: '🎮' },
  { id: 'players', label: 'Players', icon: '🧒' },
  { id: 'tickets', label: 'Tickets', icon: '🎟️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function ControlMain({ email }: { email: string }) {
  const live = useSnapshot({ kind: 'owner' });
  const { snap, derived, online } = live;
  const [tab, setTab] = useState<TabId>('match');
  const { busy, run } = useAction();
  const creating = useRef(false);

  // First run (or after the current tournament was deleted): make a setup tournament.
  useEffect(() => {
    if (snap && !snap.tournament && !creating.current) {
      creating.current = true;
      void newTournament({ players: snap.players })
        .then(() => live.refresh())
        .finally(() => (creating.current = false));
    }
  }, [snap, live]);

  // One-time update of saved ticket amounts and prize list to the current defaults.
  const migrating = useRef(false);
  useEffect(() => {
    const s = snap?.settings;
    const oldTickets = s && (s.ticketsVersion ?? 1) < TICKET_SCALE_VERSION;
    const oldPrizes = s && (s.prizesVersion ?? 1) < PRIZES_VERSION;
    if (snap && (oldTickets || oldPrizes) && !migrating.current) {
      migrating.current = true;
      void saveSettings(snap, {
        ...(oldTickets ? { tickets: DEFAULT_TICKETS, ticketsVersion: TICKET_SCALE_VERSION } : {}),
        // New price list; price board mode keeps the in-app store closed.
        ...(oldPrizes ? { prizes: DEFAULT_PRIZES, prizesVersion: PRIZES_VERSION, prizeStoreMode: 'board' as const, prizeStoreOpen: false } : {}),
      })
        .then(() => live.refresh())
        .catch(() => (migrating.current = false));
    }
  }, [snap, live]);

  // Keep private photo links fresh while Control is open.
  const snapRef = useRef<Snapshot | null>(null);
  snapRef.current = snap;
  useEffect(() => {
    const tick = () => snapRef.current && void refreshPhotoLinks(snapRef.current).catch(() => {});
    const first = window.setTimeout(tick, 2000);
    const every = window.setInterval(tick, 3 * 3600 * 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, []);

  const demo = useDemo(snap, live.refresh);
  const budget = useBudget(live);
  const [remind, closeRemind] = useSmashReminder(live);

  if (!snap || !derived || !snap.tournament) {
    return <div className="center muted">{live.error ? `Can't reach the database: ${live.error}` : 'Loading…'}</div>;
  }

  const canUndo = Boolean(derived.lastEvent);
  const undo = () =>
    run(async () => {
      const e = await undoLast(snap);
      await live.refresh();
      return e;
    }, (e) => `Undid: ${e ? describeEvent(e, snap.players) : 'last result'}`);

  return (
    <>
      <header className="c-top">
        <div className="c-top__title">
          {snap.settings.title}
          {snap.tournament.is_demo && <span className="pill pill--demo">DEMO</span>}
          {!online && <span className="pill pill--offline">Offline · retrying</span>}
        </div>
        <button className="btn btn--undo" onClick={undo} disabled={!canUndo || busy || snap.settings.ticketsFrozen}>
          ↶ Undo
        </button>
      </header>
      {budget && <BudgetBar p={budget} budget={snap.settings.ticketBudget} frozen={snap.settings.ticketsFrozen} />}

      <main className="c-body">
        {tab === 'match' && <MatchTab live={live} demo={demo} />}
        {tab === 'players' && <PlayersTab live={live} />}
        {tab === 'tickets' && <TicketsTab live={live} />}
        {tab === 'settings' && <SettingsTab live={live} email={email} />}
      </main>

      <nav className="c-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`c-tab${tab === t.id ? ' c-tab--on' : ''}`} onClick={() => setTab(t.id)}>
            <span className="c-tab__icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      {remind && (
        <Sheet title={derived.status === 'playoff' ? '🏆 Bracket time: update the Switch' : '🎮 New format: update the Switch'} onClose={closeRemind}>
          <SmashRulesList rules={snap.settings.smashRules} active={activeRuleKeys(derived.status, derived.format)} />
          <button className="btn btn--xl btn--go" onClick={closeRemind}>
            Done, the Switch is set
          </button>
        </Sheet>
      )}
      {demo.last && tab === 'match' && snap.tournament.is_demo && <div className="demo-ticker">{demo.last}</div>}
    </>
  );
}

export interface DemoControl {
  playing: boolean;
  setPlaying: (v: boolean) => void;
  last: string;
}

/** While demo mode is on and playing, record a random result every few seconds. */
function useDemo(snap: Snapshot | null, refresh: () => Promise<void>): DemoControl {
  const [playing, setPlaying] = useState(false);
  const [last, setLast] = useState('');
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const isDemo = Boolean(snap?.tournament?.is_demo);

  useEffect(() => {
    if (!playing || !isDemo) return;
    let stopped = false;
    const loop = async () => {
      while (!stopped) {
        const s = snapRef.current;
        if (s?.tournament?.is_demo) {
          try {
            const msg = await demoStep(s);
            setLast(msg);
            await refresh();
            if (msg === 'Demo finished') {
              setPlaying(false);
              return;
            }
          } catch (e) {
            setLast(e instanceof Error ? e.message : String(e));
            await refresh();
          }
        }
        // Slow enough for each effect (KO, banner, countdown) to play on the TV.
        await new Promise((r) => setTimeout(r, 8500));
      }
    };
    void loop();
    return () => {
      stopped = true;
    };
  }, [playing, isDemo, refresh]);

  useEffect(() => {
    if (!isDemo) setPlaying(false);
  }, [isDemo]);

  return { playing, setPlaying, last };
}
