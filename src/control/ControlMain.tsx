import { useEffect, useRef, useState } from 'react';
import { newTournament, refreshPhotoLinks, undoLast, demoStep } from '../data/api';
import { useSnapshot } from '../data/useSnapshot';
import type { Snapshot } from '../data/types';
import { useAction } from '../ui/Toast';
import { describeEvent } from './describe';
import { MatchTab } from './MatchTab';
import { PlayersTab } from './PlayersTab';
import { SettingsTab } from './SettingsTab';
import { TicketsTab } from './TicketsTab';

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
        <button className="btn btn--undo" onClick={undo} disabled={!canUndo || busy}>
          ↶ Undo
        </button>
      </header>

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
        await new Promise((r) => setTimeout(r, 3500));
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
