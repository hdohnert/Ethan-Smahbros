import { Fragment, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import {
  endTournament,
  exitDemo,
  getOrCreateDisplayToken,
  matchPlayers,
  recordGame,
  recordKoth,
  restartFromScratch,
  setQueue,
  setupTournament,
  startBracket,
  startDemo,
  startTournament,
} from '../data/api';
import { seriesFormat, type Player } from '../data/types';
import type { Live } from '../data/useSnapshot';
import { seedTop4 } from '../rules/replay';
import type { Series } from '../rules/types';
import { Avatar } from '../ui/Avatar';
import { Confirm } from '../ui/Confirm';
import { appUrl, copyText } from '../ui/device';
import { useAction, useToast } from '../ui/Toast';
import type { DemoControl } from './ControlMain';

const SERIES_NAME = { semi1: 'Semifinal 1', semi2: 'Semifinal 2', final: 'Final' } as const;

export function MatchTab({ live, demo }: { live: Live; demo: DemoControl }) {
  const { snap, derived: d } = live;
  if (!snap || !d) return null;
  return (
    <div className="stack">
      {d.status === 'setup' && <Setup live={live} />}
      {d.status === 'koth' && (
        <>
          <KothCard live={live} />
          <UpNext live={live} />
          <BracketStarter live={live} />
        </>
      )}
      {d.status === 'playoff' && <PlayoffCard live={live} />}
      {d.status === 'finished' && <FinishedCard live={live} />}
      {(d.status === 'koth' || d.status === 'playoff') && <EndButton live={live} />}
      <DisplayLinkCard />
      <DemoCard live={live} demo={demo} />
      <RestartCard live={live} />
    </div>
  );
}

function usePlayers(live: Live) {
  const byId = new Map((live.snap?.players ?? []).map((p) => [p.id, p]));
  return (id: string | null | undefined) => (id ? byId.get(id) : undefined);
}

// ---------------------------------------------------------------- setup

function Setup({ live }: { live: Live }) {
  const snap = live.snap!;
  const d = live.derived!;
  const t = snap.tournament!;
  const get = usePlayers(live);
  const { busy, run } = useAction();
  const active = snap.players.filter((p) => p.active);
  const defaultKing = active.find((p) => p.name.toLowerCase() === snap.settings.birthdayName.toLowerCase()) ?? active[0];
  const king = (d.king && get(d.king)?.active ? d.king : defaultKing?.id) ?? null;
  const queue = d.queue.filter((id) => id !== king);

  return (
    <section className="card stack">
      <h2 className="card__title">Set up the tournament</h2>
      {active.length < 2 ? (
        <p className="muted">Add at least 2 players on the Players tab.</p>
      ) : (
        <>
          <label className="field">
            <span>Starting king</span>
            <select
              value={king ?? ''}
              onChange={(e) => run(() => setupTournament(t, { starting_king_id: e.target.value }).then(live.refresh))}
            >
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="muted small">Line order (drag ☰ to reorder):</div>
          <QueueList
            ids={queue}
            get={get}
            onReorder={(order) => run(() => setupTournament(t, { queue: order }).then(live.refresh))}
          />
          <button
            className="btn btn--xl btn--go"
            disabled={busy || !king}
            onClick={() => run(() => startTournament(t, king!, queue).then(live.refresh), "Let's go!")}
          >
            Start Tournament
          </button>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- king of the hill

function KothCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const d = live.derived!;
  const get = usePlayers(live);
  const toast = useToast();
  const { busy, run } = useAction();
  const [pick, setPick] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const fighters = matchPlayers(d).map((id) => get(id)).filter((p): p is Player => !!p);

  if (fighters.length < 2) {
    return (
      <section className="card">
        <p className="muted">Need at least 2 active players for a match.</p>
      </section>
    );
  }

  const confirm = async () => {
    const winner = pick!;
    setPick(null);
    const res = await run(() => recordKoth(snap, d, winner));
    if (res) {
      await live.refresh();
      setFlash(winner);
      window.setTimeout(() => setFlash(null), 700);
      const won = res.awards.filter((a) => a.player_id === winner).reduce((n, a) => n + a.amount, 0);
      toast(`${get(winner)?.name} wins! +${won} 🎟️${res.rest ? ` · ${get(winner)?.name} takes a King's Rest` : ''}`);
    }
  };

  const streak = d.king ? (d.stats[d.king]?.streak ?? 0) : 0;
  const many = fighters.length > 2;
  return (
    <section className="card stack">
      <h2 className="card__title">
        Who won? <span className="pill">{d.format === '1v1' ? '1v1' : `${fighters.length}-player`}</span>
      </h2>
      {many && <p className="muted small">Tap only the winner. Everyone else goes to the back of the line.</p>}
      <div className={many ? 'match match--many' : 'match'}>
        {fighters.map((p, i) => (
          <Fragment key={p.id}>
            {!many && i === 1 && <div className="match__vs">VS</div>}
            <FighterButton
              player={p}
              label={p.id === d.king ? `👑 King${streak ? ` · ${streak}🔥` : ''}` : 'Challenger'}
              ko={flash === p.id}
              disabled={busy}
              onClick={() => setPick(p.id)}
            />
          </Fragment>
        ))}
      </div>
      {pick && (
        <Confirm title={<>🏆 {get(pick)?.name} wins?</>} confirmLabel={`Yes, ${get(pick)?.name} won`} onConfirm={confirm} onCancel={() => setPick(null)} />
      )}
    </section>
  );
}

function FighterButton({ player, label, ko, disabled, onClick }: { player: Player; label: string; ko: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button className={`fighter-btn${ko ? ' fighter-btn--ko' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="fighter-btn__label">{label}</span>
      <span className="fighter-btn__row">
        <Avatar player={player} />
        <span className="fighter-btn__name">{player.name}</span>
      </span>
      {ko && <span className="ko">K.O.!</span>}
    </button>
  );
}

function UpNext({ live }: { live: Live }) {
  const snap = live.snap!;
  const d = live.derived!;
  const get = usePlayers(live);
  const { run } = useAction();
  const [all, setAll] = useState(false);
  const save = (order: string[], note: string) => run(() => setQueue(snap, order, note).then(live.refresh));
  // Kids in the current match are on the card above; the rest wait in groups.
  const playing = d.challengers;
  const waiting = d.queue.slice(playing.length);
  const group = Math.max(1, playing.length);
  const SHOW = group * 2;
  const shown = all ? waiting : waiting.slice(0, SHOW);
  return (
    <section className="card stack">
      <h2 className="card__title">Up next</h2>
      {waiting.length === 0 ? (
        <p className="muted">Nobody else waiting.</p>
      ) : (
        <QueueList
          ids={shown}
          get={get}
          groupSize={group}
          onReorder={(order) => save([...playing, ...order, ...waiting.slice(shown.length)], 'reorder')}
          onSkip={(id) => save([...d.queue.filter((x) => x !== id), id], 'skip')}
        />
      )}
      {waiting.length > SHOW && (
        <button className="btn btn--ghost" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${waiting.length}`}
        </button>
      )}
      <p className="muted small">Skip sends a kid to the back. Kids who leave: switch them off on the Players tab.</p>
    </section>
  );
}

function QueueList({
  ids,
  get,
  onReorder,
  onSkip,
  firstLabel,
  groupSize = 1,
}: {
  ids: string[];
  get: (id: string) => Player | undefined;
  onReorder: (order: string[]) => void;
  onSkip?: (id: string) => void;
  firstLabel?: string;
  /** Show rows in blocks of this size (one block per upcoming match). */
  groupSize?: number;
}) {
  const [order, setOrder] = useState(ids);
  const [dragging, setDragging] = useState(false);
  // Follow live changes unless the user is mid-drag.
  const shown = dragging ? order : ids;
  return (
    <Reorder.Group axis="y" values={shown} onReorder={setOrder} className="queue">
      {shown.map((id, i) => (
        <QueueRow
          key={id}
          id={id}
          index={i}
          player={get(id)}
          firstLabel={i === 0 ? firstLabel : undefined}
          group={groupSize > 1 ? { index: Math.floor(i / groupSize), start: i % groupSize === 0, end: i % groupSize === groupSize - 1 || i === shown.length - 1 } : undefined}
          onDragStart={() => {
            setOrder(ids);
            setDragging(true);
          }}
          onDragEnd={() => {
            setDragging(false);
            if (order.join() !== ids.join()) onReorder(order);
          }}
          onSkip={onSkip ? () => onSkip(id) : undefined}
        />
      ))}
    </Reorder.Group>
  );
}

function QueueRow(props: {
  id: string;
  index: number;
  player?: Player;
  firstLabel?: string;
  group?: { index: number; start: boolean; end: boolean };
  onDragStart: () => void;
  onDragEnd: () => void;
  onSkip?: () => void;
}) {
  const controls = useDragControls();
  const g = props.group;
  const label = g ? (g.index === 0 ? 'Next match' : g.index === 1 ? 'After that' : `In ${g.index + 1} matches`) : undefined;
  return (
    <Reorder.Item
      value={props.id}
      className={`queue__row${g ? ` queue__row--grouped queue__row--g${g.index % 2}${g.start ? ' queue__row--gstart' : ''}${g.end ? ' queue__row--gend' : ''}` : ''}`}
      data-label={g?.start ? label : undefined}
      dragListener={false}
      dragControls={controls}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
    >
      <span className="queue__handle" onPointerDown={(e) => controls.start(e)} aria-label="Drag to reorder">
        ☰
      </span>
      <span className="queue__num">{props.index + 1}</span>
      {props.player && <Avatar player={props.player} />}
      <span className="queue__name">{props.player?.name ?? '?'}</span>
      {props.firstLabel && <span className="pill">{props.firstLabel}</span>}
      {props.onSkip && (
        <button className="btn btn--small" onClick={props.onSkip}>
          Skip
        </button>
      )}
    </Reorder.Item>
  );
}

function BracketStarter({ live }: { live: Live }) {
  const snap = live.snap!;
  const d = live.derived!;
  const get = usePlayers(live);
  const { busy, run } = useAction();
  const [ask, setAsk] = useState(false);
  const seeding = seedTop4(d, snap.players);
  return (
    <section className="card stack">
      <button className="btn btn--xl btn--gold" disabled={!seeding.ok || busy} onClick={() => setAsk(true)}>
        🏆 Start Top-4 Bracket
      </button>
      {!seeding.ok && <p className="muted small">{seeding.reason}</p>}
      {ask && seeding.ok && (
        <Confirm
          title="Start the Top-4 playoff?"
          confirmLabel="Start the bracket"
          onCancel={() => setAsk(false)}
          onConfirm={() => {
            setAsk(false);
            void run(() => startBracket(snap, d).then(live.refresh), 'Bracket started!');
          }}
        >
          <ol className="seeds">
            {seeding.seeds.map((id) => (
              <li key={id}>{get(id)?.name}</li>
            ))}
          </ol>
          <p className="muted small">
            Semis: 1 vs 4 and 2 vs 3 ({seriesFormat(snap.settings.semiBestOf)}). Final: {seriesFormat(snap.settings.finalBestOf)}. Each
            makes the Top 4 and earns {snap.settings.tickets.top4} tickets.
          </p>
        </Confirm>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- playoff

function PlayoffCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const d = live.derived!;
  const get = usePlayers(live);
  const toast = useToast();
  const { busy, run } = useAction();
  const [pick, setPick] = useState<string | null>(null);
  const s = d.currentSeries;
  const b = d.bracket!;

  const confirm = async () => {
    const winner = pick!;
    setPick(null);
    const tickets = await run(() => recordGame(snap, d, s!.id, winner));
    if (tickets) {
      await live.refresh();
      const won = tickets.filter((t) => t.player_id === winner).reduce((n, t) => n + t.amount, 0);
      const series = tickets.some((t) => t.reason === 'Reached the final' || t.reason === 'Champion!');
      toast(`${get(winner)?.name} wins the ${series ? 'series' : 'game'}! +${won} 🎟️`);
    }
  };

  return (
    <section className="card stack">
      <h2 className="card__title">Top-4 Playoff · always 1 vs 1</h2>
      {s && s.a && s.b && get(s.a) && get(s.b) && (
        <>
          <div className="muted">
            <b>{SERIES_NAME[s.id]} · {seriesFormat(s.bestOf)}</b> · tap the winner of this game
          </div>
          <div className="match">
            <SeriesButton player={get(s.a)!} wins={s.winsA} need={s.need} disabled={busy} onClick={() => setPick(s.a)} />
            <div className="match__vs">VS</div>
            <SeriesButton player={get(s.b)!} wins={s.winsB} need={s.need} disabled={busy} onClick={() => setPick(s.b)} />
          </div>
        </>
      )}
      <div className="bracket-mini">
        {[b.semi1, b.semi2, b.final].map((x) => (
          <SeriesLine key={x.id} s={x} name={(id) => get(id)?.name ?? 'TBD'} />
        ))}
      </div>
      {pick && s && (
        <Confirm title={<>🏆 {get(pick)?.name} won this game?</>} confirmLabel={`Yes, ${get(pick)?.name} won`} onConfirm={confirm} onCancel={() => setPick(null)} />
      )}
    </section>
  );
}

function SeriesButton({ player, wins, need, disabled, onClick }: { player: Player; wins: number; need: number; disabled: boolean; onClick: () => void }) {
  return (
    <button className="fighter-btn" onClick={onClick} disabled={disabled}>
      <span className="fighter-btn__label">{need > 1 ? '★'.repeat(wins) + '☆'.repeat(need - wins) : 'One game'}</span>
      <span className="fighter-btn__row">
        <Avatar player={player} />
        <span className="fighter-btn__name">{player.name}</span>
      </span>
    </button>
  );
}

function SeriesLine({ s, name }: { s: Series; name: (id: string | null) => string }) {
  return (
    <div className={`series-line${s.winner ? ' series-line--done' : ''}`}>
      <span className="series-line__label">
        {SERIES_NAME[s.id]}
        <br />
        <small>{seriesFormat(s.bestOf)}</small>
      </span>
      <span className={s.winner && s.winner === s.a ? 'win' : ''}>{s.a ? name(s.a) : 'TBD'}</span>
      <b>
        {s.winsA}–{s.winsB}
      </b>
      <span className={s.winner && s.winner === s.b ? 'win' : ''}>{s.b ? name(s.b) : 'TBD'}</span>
    </div>
  );
}

function FinishedCard({ live }: { live: Live }) {
  const d = live.derived!;
  const get = usePlayers(live);
  const champ = get(d.champion);
  return (
    <section className="card stack center-text">
      <h2 className="card__title">Tournament over</h2>
      {champ ? (
        <div className="champ">
          🏆 <Avatar player={champ} /> {champ.name} is the champion!
        </div>
      ) : (
        <p>The tournament was ended.</p>
      )}
      <p className="muted small">Undo brings it back. Restart from scratch below starts a new one.</p>
    </section>
  );
}

function EndButton({ live }: { live: Live }) {
  const { busy, run } = useAction();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button className="btn btn--ghost" disabled={busy} onClick={() => setAsk(true)}>
        End Tournament
      </button>
      {ask && (
        <Confirm
          title="End the tournament now?"
          confirmLabel="End it"
          danger
          onCancel={() => setAsk(false)}
          onConfirm={() => {
            setAsk(false);
            void run(() => endTournament(live.snap!).then(live.refresh));
          }}
        >
          <p className="muted small">The TV shows the end-of-night screen. Undo can reopen it.</p>
        </Confirm>
      )}
    </>
  );
}

// ---------------------------------------------------------------- display, demo, restart

function DisplayLinkCard() {
  const [url, setUrl] = useState<string | null>(null);
  const toast = useToast();
  const { busy, run } = useAction();
  return (
    <section className="card stack">
      <h2 className="card__title">📺 TV Display</h2>
      {!url ? (
        <button
          className="btn"
          disabled={busy}
          onClick={() => run(async () => setUrl(appUrl(`display?t=${await getOrCreateDisplayToken()}`)))}
        >
          Get the Display link
        </button>
      ) : (
        <>
          <input className="link-box" readOnly value={url} onFocus={(e) => e.target.select()} />
          <div className="row">
            <button className="btn" onClick={async () => toast((await copyText(url)) ? 'Link copied' : 'Copy failed; select the text instead')}>
              Copy link
            </button>
            <a className="btn" href={url} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
          <p className="muted small">
            Open this link on the TV device (it's read-only, no sign-in). Then Share → Add to Home Screen, and launch from the icon.
          </p>
        </>
      )}
    </section>
  );
}

function DemoCard({ live, demo }: { live: Live; demo: DemoControl }) {
  const snap = live.snap!;
  const { busy, run } = useAction();
  const isDemo = snap.tournament?.is_demo;
  return (
    <section className="card stack">
      <h2 className="card__title">🎪 Demo mode</h2>
      {!isDemo ? (
        <>
          <p className="muted small">Fills in 20 pretend kids and plays random results so you can preview every screen on the TV. Your real players and tickets are untouched.</p>
          <button className="btn" disabled={busy} onClick={() => run(() => startDemo(snap).then(live.refresh).then(() => demo.setPlaying(true)), 'Demo started')}>
            Start demo
          </button>
        </>
      ) : (
        <>
          <div className="row">
            <button className="btn" onClick={() => demo.setPlaying(!demo.playing)}>
              {demo.playing ? '⏸ Pause' : '▶ Auto-play'}
            </button>
            <button
              className="btn btn--danger"
              disabled={busy}
              onClick={() => {
                demo.setPlaying(false);
                void run(() => exitDemo(snap).then(live.refresh), 'Demo cleared, back to the real tournament');
              }}
            >
              Exit demo
            </button>
          </div>
          <p className="muted small">You can also tap winners yourself while the demo is paused.</p>
        </>
      )}
    </section>
  );
}

function RestartCard({ live }: { live: Live }) {
  const snap = live.snap!;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [keepTickets, setKeepTickets] = useState(true);
  const { busy, run } = useAction();
  return (
    <section className="card stack">
      <button className="btn btn--ghost btn--danger-text" onClick={() => setOpen(true)}>
        Restart from scratch…
      </button>
      {open && (
        <Confirm
          title="Restart from scratch?"
          confirmLabel="Restart"
          danger
          disabled={typed.trim().toUpperCase() !== 'RESTART' || busy}
          onCancel={() => {
            setOpen(false);
            setTyped('');
          }}
          onConfirm={() => {
            setOpen(false);
            setTyped('');
            void run(() => restartFromScratch(snap, keepTickets).then(live.refresh), 'New tournament ready');
          }}
        >
          <p className="small">Wipes all scores. Player names stay.</p>
          <label className="check">
            <input type="checkbox" checked={keepTickets} onChange={(e) => setKeepTickets(e.target.checked)} />
            Keep everyone's Ticket Bank balances
          </label>
          <label className="field">
            <span>Type RESTART to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
          </label>
        </Confirm>
      )}
    </section>
  );
}
