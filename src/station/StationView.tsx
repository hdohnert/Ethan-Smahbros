import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Sheet } from '../ui/Confirm';
import { deviceId, store } from '../ui/device';
import { ToastProvider, useAction } from '../ui/Toast';
import { PinGate } from './PinGate';
import { stationCall, useStation, type RosterPlayer } from './stationApi';
import '../control/control.css';

const GAMES = ['Ring Toss', 'Bean Bag Toss', 'Duck Pond', 'Cake Walk', 'Bowling', 'Balloon Pop'];

export function StationView() {
  return (
    <ToastProvider>
      <div className="control">
        <Station />
      </div>
    </ToastProvider>
  );
}

function Station() {
  const st = useStation();
  const [game, setGameState] = useState(() => store('station-game') ?? '');
  const [kid, setKid] = useState<RosterPlayer | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const { busy, run } = useAction();
  const setGame = (g: string) => setGameState(store('station-game', g) ?? '');

  if (!st.pin || !st.roster) {
    if (st.pin && !st.error) return <div className="center muted">Loading…</div>;
    return <PinGate title="🎯 Game Station" error={st.error} onPin={st.setPin} />;
  }
  if (!game) return <GamePicker onPick={setGame} />;

  const award = (amount: number) => {
    const p = kid!;
    setKid(null);
    void run(async () => {
      await stationCall('station_award', { p_pin: st.pin, p_station: game, p_device: deviceId(), p_player: p.id, p_amount: amount });
      setLast(`+${amount} for ${p.name}`);
      await st.reload();
    }, `+${amount} 🎟️ for ${p.name}!`);
  };

  return (
    <>
      <header className="c-top">
        <div className="c-top__title">🎯 {game}</div>
        <button className="btn btn--small" onClick={() => setGame('')}>
          Change game
        </button>
      </header>
      <main className="c-body">
        {st.error && <div className="pill pill--offline">{st.error}</div>}
        <p className="muted">Tap a kid, then how many tickets.</p>
        <div className="kid-grid">
          {st.roster.players.map((p) => (
            <button key={p.id} className="kid-btn" onClick={() => setKid(p)} disabled={busy}>
              <Avatar player={p} className="avatar--big" />
              <span className="kid-btn__name">{p.name}</span>
              <span className="kid-btn__bal">{p.balance} 🎟️</span>
            </button>
          ))}
        </div>
        {last && (
          <button
            className="btn btn--ghost undo-station"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await stationCall('station_undo', { p_pin: st.pin, p_device: deviceId() });
                setLast(null);
                await st.reload();
              }, 'Last award undone')
            }
          >
            ↶ Undo {last}
          </button>
        )}
      </main>
      {kid && (
        <Sheet title={<>Tickets for {kid.name}</>} onClose={() => setKid(null)}>
          <div className="amount-grid">
            {[1, 2, 3, 5].map((n) => (
              <button key={n} className="btn btn--xl btn--go" onClick={() => award(n)}>
                +{n}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

function GamePicker({ onPick }: { onPick: (g: string) => void }) {
  const [custom, setCustom] = useState('');
  return (
    <div className="center stack">
      <h1 className="c-title">Which game is this?</h1>
      <div className="stack">
        {GAMES.map((g) => (
          <button key={g} className="btn btn--xl" onClick={() => onPick(g)}>
            {g}
          </button>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) onPick(custom.trim().slice(0, 40));
        }}
      >
        <input className="grow" placeholder="Other game name" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="btn btn--go">OK</button>
      </form>
    </div>
  );
}
