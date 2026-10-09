import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_TRIVIA, TRIVIA_GAME, type TriviaLive, type TriviaQ } from '../data/trivia';
import { Avatar } from '../ui/Avatar';
import { deviceId, store } from '../ui/device';
import { useAction, useToast } from '../ui/Toast';
import { stationCall, type RosterPlayer, type useStation } from './stationApi';

type Station = ReturnType<typeof useStation>;

/** Shuffled question order and the ones already asked, remembered on this phone. */
function useDeck(questions: TriviaQ[]) {
  const ids = questions.map((q) => q.id).join(',');
  const [order, setOrder] = useState<string[]>(() => {
    const saved = (store('trivia-order') ?? '').split(',').filter(Boolean);
    return saved.length ? saved : shuffle(questions.map((q) => q.id));
  });
  const [asked, setAsked] = useState<string[]>(() => (store('trivia-asked') ?? '').split(',').filter(Boolean));
  // New questions added in Control join the end of the deck.
  useEffect(() => {
    const known = new Set(order);
    const added = questions.map((q) => q.id).filter((id) => !known.has(id));
    if (added.length) {
      const next = [...order, ...shuffle(added)];
      setOrder(next);
      store('trivia-order', next.join(','));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const left = order.filter((id) => byId.has(id) && !asked.includes(id));
  const markAsked = (id: string) => {
    const next = [...asked, id];
    setAsked(next);
    store('trivia-asked', next.join(','));
  };
  const restart = () => {
    const next = shuffle(questions.map((q) => q.id));
    setOrder(next);
    setAsked([]);
    store('trivia-order', next.join(','));
    store('trivia-asked', '');
  };
  return { current: left.length ? byId.get(left[0])! : null, number: questions.length - left.length + 1, total: questions.length, markAsked, restart };
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The helper reads the question out loud (the answer is on their screen),
 * can put it on the trivia TV, reveal the answer there, then taps the kid
 * who got it right for tickets.
 */
export function TriviaStation({ st }: { st: Station }) {
  const roster = st.roster!;
  const questions = useMemo(() => (roster.trivia?.length ? roster.trivia : DEFAULT_TRIVIA), [roster.trivia]);
  const amount = [1, 2, 3, 5].includes(roster.trivia_tickets ?? 0) ? roster.trivia_tickets! : 2;
  const deck = useDeck(questions);
  const q = deck.current;
  const { busy, run } = useAction();
  const toast = useToast();
  const [onTv, setOnTv] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [winner, setWinner] = useState<RosterPlayer | null>(null);

  const live = (l: Omit<TriviaLive, 'at'> | null) => stationCall('station_trivia', { p_pin: st.pin, p_live: l }).catch((e) => toast(String(e.message ?? e), 'error'));

  const show = () => {
    if (!q) return;
    setOnTv(true);
    setRevealed(false);
    void live({ qid: q.id, phase: 'question', winner: null, amount: null });
  };
  const reveal = () => {
    if (!q) return;
    setRevealed(true);
    void live({ qid: q.id, phase: 'answer', winner: null, amount: null });
  };
  const next = () => {
    if (q) deck.markAsked(q.id);
    setWinner(null);
    setRevealed(false);
    // The TV goes back to its Trivia Time screen until the next Show on TV.
    if (onTv) {
      setOnTv(false);
      void live(null);
    }
  };
  const done = () => {
    setOnTv(false);
    setRevealed(false);
    void live(null);
  };

  const award = (p: RosterPlayer) =>
    run(async () => {
      await stationCall('station_award', { p_pin: st.pin, p_station: TRIVIA_GAME, p_device: deviceId(), p_player: p.id, p_amount: amount });
      setWinner(p);
      if (onTv && q) await live({ qid: q.id, phase: 'winner', winner: p.id, amount });
      await st.reload();
    }, `✅ +${amount} 🎟️ for ${p.name}!`);

  if (!q) {
    return (
      <section className="card stack center-text">
        <h2 className="card__title">🎉 That's every question!</h2>
        <p className="muted">All {deck.total} have been asked on this phone.</p>
        <button className="btn btn--xl btn--go" onClick={deck.restart}>
          Start over
        </button>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="card stack trivia-card">
        <div className="trivia-card__top">
          <span className="trivia-card__cat">{q.cat}</span>
          <span className="muted small">
            {deck.number} of {deck.total}
          </span>
        </div>
        <div className="trivia-card__q">{q.q}</div>
        <div className="trivia-card__a">
          Answer: <b>{q.a}</b>
        </div>
        <div className="row trivia-card__tv">
          {!onTv ? (
            <button className="btn" onClick={show}>
              📺 Show on TV
            </button>
          ) : (
            <>
              <button className="btn" disabled={revealed} onClick={reveal}>
                {revealed ? '✅ Answer on TV' : '👀 Reveal on TV'}
              </button>
              <button className="btn btn--ghost" onClick={done}>
                Done with TV
              </button>
            </>
          )}
        </div>
      </section>

      {winner ? (
        <section className="card stack center-text">
          <div className="trivia-win">
            ✅ {winner.name} +{amount} 🎟️
          </div>
          <button
            className="btn btn--ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await stationCall('station_undo', { p_pin: st.pin, p_device: deviceId() });
                setWinner(null);
                if (onTv) await live({ qid: q.id, phase: revealed ? 'answer' : 'question', winner: null, amount: null });
                await st.reload();
              }, 'Undone')
            }
          >
            ↶ Undo (wrong kid)
          </button>
        </section>
      ) : (
        <>
          <p className="muted">Who got it right? Tap them for +{amount} 🎟️</p>
          <div className="kid-grid">
            {roster.players.map((p) => (
              <button key={p.id} className="kid-btn" onClick={() => void award(p)} disabled={busy || !!roster.frozen}>
                <Avatar player={p} className="avatar--big" />
                <span className="kid-btn__name">{p.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <button className="btn btn--xl btn--go" disabled={busy} onClick={next}>
        {winner ? 'Next question →' : 'Nobody got it · next question →'}
      </button>
      {onTv && <p className="muted small">After this, the next question stays on your phone until you tap 📺 Show on TV again.</p>}
    </div>
  );
}
