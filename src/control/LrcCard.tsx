import { useState } from 'react';
import { currentLrc, finishLrcRound, setLrcWinner, startLrcRound, ticketsLeft, undoLrcRound, undoLrcTable } from '../data/api';
import type { Live } from '../data/useSnapshot';
import { roundCost, tablePayout } from '../rules/lrc';
import { Avatar } from '../ui/Avatar';
import { Confirm } from '../ui/Confirm';
import { useAction } from '../ui/Toast';

/** Left Right Center rounds: deal tables, tap each table's winner. */
export function LrcCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const s = snap.settings;
  const { busy, run } = useAction();
  const [pick, setPick] = useState<{ table: number; playerId: string } | null>(null);
  const [askUndo, setAskUndo] = useState(false);
  const round = currentLrc(snap);
  const here = snap.players.filter((p) => p.active).length;
  const cost = roundCost(here, s.lrcTicketsEach);
  const left = ticketsLeft(snap);
  const name = (id: string) => snap.players.find((p) => p.id === id);

  if (!round) {
    const enough = cost <= left;
    return (
      <section className="card stack">
        <h2 className="card__title">🎲 {s.lrcName}</h2>
        <p className="muted small">
          Everyone starts with {s.lrcTicketsEach} tickets, {s.lrcTableSize} kids per table. The last kid with tickets at each table wins
          every ticket at that table.
        </p>
        <div className={`lrc-check${enough ? '' : ' lrc-check--no'}`}>
          {enough ? '✅' : '⛔'} This round needs <b>{cost}</b> tickets ({here} kids × {s.lrcTicketsEach}). {left} left in the bank.
        </div>
        <button
          className="btn btn--xl btn--go"
          disabled={busy || !enough || s.ticketsFrozen || here < 2}
          onClick={() => run(() => startLrcRound(snap).then(live.refresh), 'Tables are ready!')}
        >
          Start a round
        </button>
        <p className="muted small">Change tickets per player, table size and the game name in Settings.</p>
      </section>
    );
  }

  const done = Object.keys(round.winners).length;
  return (
    <section className="card stack">
      <h2 className="card__title">
        🎲 {round.name} · {done}/{round.tables.length} tables done
      </h2>
      {round.tables.map((table, i) => {
        const w = round.winners[i];
        return (
          <div key={i} className={`lrc-table${w ? ' lrc-table--done' : ''}`}>
            <div className="lrc-table__head">
              <b>Table {i + 1}</b>
              <span className="muted small">
                {table.length} kids · winner gets {tablePayout(table, round.ticketsEach)}
              </span>
            </div>
            {w ? (
              <div className="lrc-table__winner">
                🏆 {name(w.playerId)?.name} +{w.amount}
                <button className="btn btn--small" disabled={busy || s.ticketsFrozen} onClick={() => run(() => undoLrcTable(snap, i).then(live.refresh), 'Table undone')}>
                  Undo
                </button>
              </div>
            ) : (
              <div className="lrc-table__kids">
                {table.map((id) => {
                  const p = name(id);
                  return (
                    <button key={id} className="lrc-kid" disabled={busy} onClick={() => setPick({ table: i, playerId: id })}>
                      {p && <Avatar player={p} />}
                      <span>{p?.name ?? '?'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <p className="muted small">Tap the last kid with tickets at each table.</p>
      <div className="row">
        <button
          className="btn btn--go grow"
          disabled={busy}
          onClick={() => run(() => finishLrcRound(snap).then(live.refresh), 'Round finished')}
        >
          {done === round.tables.length ? 'Finish round' : 'Finish round early'}
        </button>
        <button className="btn btn--ghost btn--danger-text" disabled={busy || s.ticketsFrozen} onClick={() => setAskUndo(true)}>
          Undo whole round
        </button>
      </div>
      {pick && (
        <Confirm
          title={<>🏆 {name(pick.playerId)?.name} wins table {pick.table + 1}?</>}
          confirmLabel={`Yes, +${tablePayout(round.tables[pick.table], round.ticketsEach)} tickets`}
          onCancel={() => setPick(null)}
          onConfirm={() => {
            const p = pick;
            setPick(null);
            void run(() => setLrcWinner(snap, p.table, p.playerId).then(async (n) => {
              await live.refresh();
              return n;
            }), (n) => `+${n} for ${name(p.playerId)?.name}!`);
          }}
        />
      )}
      {askUndo && (
        <Confirm
          title="Undo the whole round?"
          confirmLabel="Undo round"
          danger
          onCancel={() => setAskUndo(false)}
          onConfirm={() => {
            setAskUndo(false);
            void run(() => undoLrcRound(snap).then(live.refresh), 'Round undone');
          }}
        >
          <p className="small">Takes back every table's tickets and clears the tables.</p>
        </Confirm>
      )}
    </section>
  );
}
