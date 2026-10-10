import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TRIVIA, TRIVIA_STALE_MS, withNewTrivia } from '../data/trivia';
import { burst } from '../effects/confetti';
import { Avatar } from '../ui/Avatar';
import type { BoardModel } from './model';
import { PHOTO_MS, PhotoScreen } from './PhotoScreen';

/** Idle slideshow: 4 photos, then the leaderboard for 10 s, then again. */
const SLIDE_PHOTOS_MS = 4 * PHOTO_MS;
const SLIDE_CYCLE_MS = SLIDE_PHOTOS_MS + 10_000;

/**
 * The second TV. While a Trivia station has a question up: the question,
 * then the answer, then who got it. Otherwise "Trivia Time!" with the
 * trivia leaderboard.
 */
export function TriviaScreen({ m, reduced }: { m: BoardModel; reduced: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const questions = withNewTrivia(m.settings.trivia);
  const live = m.triviaLive;
  // Look in the saved list first, then the built-in questions, so a helper phone with a newer list still shows up here.
  // Time it from when this TV first got the step, so a TV clock that's off doesn't hide questions.
  const [seen, setSeen] = useState<{ at: string; local: number } | null>(null);
  useEffect(() => {
    if (live?.at && live.at !== seen?.at) setSeen({ at: live.at, local: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.at]);
  // (An hour by the server's clock still drops a question a helper left up long ago.)
  const fresh =
    !!live && now - (seen?.at === live.at ? seen.local : Date.now()) < TRIVIA_STALE_MS && now - Date.parse(live.at) < 60 * 60_000;
  const q = fresh ? (questions.find((x) => x.id === live.qid) ?? DEFAULT_TRIVIA.find((x) => x.id === live.qid)) : undefined;
  const winner = live?.winner ? m.roster.find((p) => p.id === live.winner) : undefined;

  // Quiet for a few minutes (no question up, no right answer tapped): photo slideshow,
  // with the leaderboard back for a moment after every few photos.
  const answered = Object.values(m.triviaCounts).reduce((a, b) => a + b, 0);
  const activity = `${live?.qid}|${live?.phase}|${live?.winner}|${live?.at}|${answered}`;
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  useEffect(() => setLastActivity(Date.now()), [activity]);
  const idleMs = m.settings.triviaSlideshowMinutes * 60_000;
  const quietFor = now - lastActivity - idleMs;
  const slideshow = !q && idleMs > 0 && m.settings.photos.length > 0 && quietFor >= 0 && quietFor % SLIDE_CYCLE_MS < SLIDE_PHOTOS_MS;

  // Confetti once per winner.
  const cheered = useRef<string | null>(null);
  useEffect(() => {
    const key = live?.phase === 'winner' ? `${live.qid}:${live.winner}` : null;
    if (key && key !== cheered.current) burst({ count: 90, y: 0.6 });
    cheered.current = key;
  }, [live?.phase, live?.qid, live?.winner]);

  const fade = reduced ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

  if (slideshow) return <PhotoScreen m={m} />;

  return (
    <div className="trivia safe">
      <AnimatePresence mode="wait">
        {q ? (
          <motion.section key={q.id} className="trivia__q-wrap" {...fade} exit={{ opacity: 0 }}>
            <div className="trivia__cat">{q.cat}</div>
            <div className="trivia__q">{q.q}</div>
            {live!.phase !== 'question' ? (
              <motion.div className="trivia__a" {...(reduced ? {} : { initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 } })}>
                {q.a}
              </motion.div>
            ) : (
              <div className="trivia__think">🤔 Raise your hand if you know it!</div>
            )}
            {live!.phase === 'winner' && winner && (
              <motion.div className="trivia__winner" {...(reduced ? {} : { initial: { scale: 2, opacity: 0 }, animate: { scale: 1, opacity: 1 } })}>
                <Avatar player={winner} className="avatar--lg" />
                <span>
                  ✅ {winner.name} +{live!.amount ?? m.settings.triviaTickets} 🎟️
                </span>
              </motion.div>
            )}
          </motion.section>
        ) : (
          <motion.section key="idle" className="trivia__idle" {...fade} exit={{ opacity: 0 }}>
            <h1 className="trivia__title">🧠 Trivia Time!</h1>
            <p className="trivia__sub">Answer right and win tickets. Find the Trivia helper!</p>
            <Leaders m={m} />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function Leaders({ m }: { m: BoardModel }) {
  const rows = m.roster
    .map((p) => ({ p, n: m.triviaCounts[p.id] ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n || a.p.name.localeCompare(b.p.name))
    .slice(0, 8);
  if (!rows.length) return <div className="trivia__empty">Nobody has answered yet. Who will be first?</div>;
  return (
    <ol className="trivia__leaders panel">
      {rows.map(({ p, n }, i) => (
        <li key={p.id}>
          <span className="trivia__rank">{i + 1}</span>
          <Avatar player={p} />
          <span className="trivia__name">{p.name}</span>
          <span className="trivia__n">
            {n} ✅
          </span>
        </li>
      ))}
    </ol>
  );
}
