import { useState } from 'react';
import { buyPrize } from '../data/api';
import type { Prize } from '../data/types';
import { useAuth } from '../data/useAuth';
import { useSnapshot } from '../data/useSnapshot';
import { Avatar, type AvatarLike } from '../ui/Avatar';
import { Confirm } from '../ui/Confirm';
import { deviceId } from '../ui/device';
import { ToastProvider, useAction } from '../ui/Toast';
import { PinGate } from './PinGate';
import { useStation } from './stationApi';
import '../control/control.css';

interface Kid extends AvatarLike {
  id: string;
  balance: number;
}

export function PrizeStoreView() {
  return (
    <ToastProvider>
      <div className="control">
        <PrizeGate />
      </div>
    </ToastProvider>
  );
}

/** Signed-in owner uses the live snapshot; helpers use the station PIN. */
function PrizeGate() {
  const auth = useAuth();
  if (auth.loading) return <div className="center muted">Loading…</div>;
  return auth.owner ? <OwnerStore /> : <PinStore />;
}

function OwnerStore() {
  const live = useSnapshot({ kind: 'owner' });
  if (!live.snap) return <div className="center muted">Loading…</div>;
  const kids = [...live.snap.players]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ ...p, balance: live.balances[p.id] ?? 0 }));
  return (
    <>
      {live.snap.settings.ticketsFrozen && <div className="frozen-banner frozen-banner--top">🔒 Tickets frozen for payout</div>}
      <Store open={live.snap.settings.prizeStoreOpen} prizes={live.snap.settings.prizes} kids={kids} pin={null} reload={live.refresh} />
    </>
  );
}

function PinStore() {
  const st = useStation();
  if (!st.pin || !st.roster) {
    if (st.pin && !st.error) return <div className="center muted">Loading…</div>;
    return <PinGate title="🎁 Prize Store" error={st.error} onPin={st.setPin} />;
  }
  return (
    <>
      {st.roster.frozen && <div className="frozen-banner frozen-banner--top">🔒 Tickets frozen for payout</div>}
      <Store open={st.roster.prize_store_open} prizes={st.roster.prizes} kids={st.roster.players} pin={st.pin} reload={() => st.reload()} />
    </>
  );
}

function Store({ open, prizes, kids, pin, reload }: { open: boolean; prizes: Prize[]; kids: Kid[]; pin: string | null; reload: () => Promise<void> }) {
  const [kidId, setKidId] = useState<string | null>(null);
  const [prize, setPrize] = useState<Prize | null>(null);
  const { busy, run } = useAction();
  const kid = kids.find((k) => k.id === kidId) ?? null;

  // Price board (the default): prices only, kids pay with physical tickets.
  if (!open) {
    return (
      <div className="center stack">
        <h1 className="c-title">🎁 Prize Store</h1>
        <div className="price-board">
          {[...prizes].sort((a, b) => a.cost - b.cost).map((p) => (
            <div key={p.name} className="price-tag">
              <span className="price-tag__name">{p.name}</span>
              <span className="price-tag__cost">{p.cost} 🎟️</span>
            </div>
          ))}
        </div>
        <p className="muted small">Pay with your tickets at the prize table.</p>
      </div>
    );
  }

  if (!kid) {
    return (
      <>
        <header className="c-top">
          <div className="c-top__title">🎁 Prize Store</div>
        </header>
        <main className="c-body">
          <p className="muted">Who's shopping?</p>
          <div className="kid-grid">
            {kids.map((k) => (
              <button key={k.id} className="kid-btn" onClick={() => setKidId(k.id)}>
                <Avatar player={k} className="avatar--big" />
                <span className="kid-btn__name">{k.name}</span>
                <span className="kid-btn__bal">{k.balance} 🎟️</span>
              </button>
            ))}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="c-top">
        <button className="btn btn--small" onClick={() => setKidId(null)}>
          ← Kids
        </button>
        <div className="c-top__title">
          <Avatar player={kid} /> {kid.name}
        </div>
      </header>
      <main className="c-body stack">
        <div className="big-balance">
          {kid.balance} <span>tickets</span>
        </div>
        <div className="prize-grid">
          {[...prizes].sort((a, b) => a.cost - b.cost).map((p) => (
            <button key={p.name} className="prize-btn" disabled={busy || p.cost > kid.balance} onClick={() => setPrize(p)}>
              <span className="prize-btn__name">{p.name}</span>
              <span className="prize-btn__cost">{p.cost} 🎟️</span>
            </button>
          ))}
        </div>
      </main>
      {prize && (
        <Confirm
          title={<>{kid.name} gets {prize.name}?</>}
          confirmLabel={`Yes, spend ${prize.cost} tickets`}
          onCancel={() => setPrize(null)}
          onConfirm={() => {
            const p = prize;
            setPrize(null);
            void run(async () => {
              const left = await buyPrize(kid.id, p.cost, p.name, pin, deviceId());
              await reload();
              return left;
            }, (left) => `🎉 ${p.name} for ${kid.name}! ${left} tickets left`);
          }}
        >
          <p className="muted">
            {kid.balance} → {kid.balance - prize.cost} tickets
          </p>
        </Confirm>
      )}
    </>
  );
}
