import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Avatar } from '../ui/Avatar';
import type { BoardModel, BoardPlayer } from '../display/model';
import type { EffectsState } from './useEffectsEngine';
import { cannons } from './confetti';
import { KICKOFF_MS } from './config';
import './effects.css';

/** Big-moment overlays on top of the board. One at a time. */
export function MomentOverlay({ m, fx, reduced }: { m: BoardModel; fx: EffectsState; reduced: boolean }) {
  const get = (id: string) => m.roster.find((p) => p.id === id);
  const mo = fx.moment;
  let body: React.ReactNode = null;
  if (mo) {
    const e = mo.effect;
    const name = (id: string) => get(id)?.name ?? '';
    if (e.type === 'newKing') body = <Slam reduced={reduced} kicker="👑 NEW KING 👑" player={get(e.playerId)} />;
    else if (e.type === 'upset') body = <Upset reduced={reduced} player={get(e.playerId)} king={name(e.kingId)} streak={e.streak} />;
    else if (e.type === 'firstWin') body = <Slam reduced={reduced} kicker="⭐ FIRST WIN! ⭐" player={get(e.playerId)} />;
    else if (e.type === 'streak') body = <Slam reduced={reduced} kicker={e.streak >= 5 ? '⚡ UNSTOPPABLE! ⚡' : '🔥 ON FIRE! 🔥'} title={`${e.streak} in a row!`} player={get(e.playerId)} />;
    else if (e.type === 'challenger') body = <YoureUp reduced={reduced} king={e.kingId ? get(e.kingId) : undefined} players={e.playerIds.map(get).filter((p): p is BoardPlayer => !!p)} />;
    else if (e.type === 'bracket') body = <BracketReveal reduced={reduced} seeds={e.seeds.map(get)} m={m} />;
    else if (e.type === 'seriesWon') body = <Slam reduced={reduced} kicker="ON TO THE FINAL!" player={get(e.playerId)} />;
    else if (e.type === 'finalIntro') body = <FinalIntro reduced={reduced} a={get(e.a)} b={get(e.b)} />;
    else if (e.type === 'jackpot') body = <Slam reduced={reduced} kicker="💰 JACKPOT! 💰" title={`+${e.amount} tickets!`} player={get(e.playerId)} />;
    else if (e.type === 'champion') body = <Champion m={m} reduced={reduced} player={get(e.playerId)} birthday={e.birthday} />;
  }
  return (
    <AnimatePresence>
      {body && (
        <motion.div
          key={mo!.key}
          className={`moment moment--${mo!.effect.type}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {body}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const slamIn = (reduced: boolean) =>
  reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { scale: 3, opacity: 0, rotate: -6 }, animate: { scale: 1, opacity: 1, rotate: 0 }, transition: { type: 'spring' as const, stiffness: 380, damping: 18 } };

function Slam({ kicker, title, player, reduced }: { kicker: string; title?: string; player?: BoardPlayer; reduced: boolean }) {
  return (
    <motion.div className="slam" {...slamIn(reduced)}>
      <div className="slam__kicker">{kicker}</div>
      {player && (
        <div className="slam__row">
          <Avatar player={player} className="avatar--xl" />
          <span className="slam__name">{player.name}</span>
        </div>
      )}
      {title && <div className="slam__name">{title}</div>}
    </motion.div>
  );
}

const COUNT = ['3', '2', '1', 'FIGHT!'];

/** Fighter intro cards (king + challengers with tonight's stats), then 3-2-1-FIGHT! */
function YoureUp({ players, king, reduced }: { players: BoardPlayer[]; king?: BoardPlayer; reduced: boolean }) {
  const [step, setStep] = useState(-1);
  const fighters = king ? [king, ...players.filter((p) => p.id !== king.id)] : players;
  useEffect(() => {
    // Cards slide in one by one; more cards take a moment longer to read.
    const base = 900 + fighters.length * 350;
    const timers = [0, 450, 900, 1350].map((t, i) => window.setTimeout(() => setStep(i), base + t));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (step < 0 || !fighters.length) {
    return (
      <div className="intro">
        <motion.div className="slam__kicker slam__kicker--flash" {...slamIn(reduced)}>
          {players.length > 1 ? "HERE COME THE FIGHTERS!" : "YOU'RE UP!"}
        </motion.div>
        <div className="intro__cards">
          {fighters.map((p, i) => (
            <motion.div
              key={p.id}
              className={`intro__card${king && p.id === king.id ? ' intro__card--king' : ''}`}
              {...(reduced
                ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
                : { initial: { y: '40vh', opacity: 0, rotate: i % 2 ? 8 : -8 }, animate: { y: 0, opacity: 1, rotate: 0 }, transition: { type: 'spring' as const, stiffness: 160, damping: 15, delay: 0.15 + i * 0.3 } })}
            >
              <div className="intro__tag">{king && p.id === king.id ? '👑 KING' : 'CHALLENGER'}</div>
              <Avatar player={p} className="avatar--xl" />
              <div className="intro__name">{p.name}</div>
              <div className="intro__stats">
                <span>
                  <b>{p.wins}</b> {p.wins === 1 ? 'win' : 'wins'}
                </span>
                {p.streak > 0 && (
                  <span>
                    🔥 <b>{p.streak}</b>
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <motion.div key={step} className={`count${step === 3 ? ' count--fight' : ''}`} {...slamIn(reduced)}>
      {COUNT[step]}
    </motion.div>
  );
}

/** 🚨 UPSET! The king on a hot streak just got knocked off. */
function Upset({ player, king, streak, reduced }: { player?: BoardPlayer; king: string; streak: number; reduced: boolean }) {
  return (
    <div className={`upset${reduced ? ' upset--calm' : ''}`}>
      <div className="upset__siren" aria-hidden>
        🚨
      </div>
      <motion.div className="upset__title" {...slamIn(reduced)}>
        UPSET!
      </motion.div>
      {player && (
        <div className="slam__row">
          <Avatar player={player} className="avatar--xl" />
          <span className="slam__name">{player.name}</span>
        </div>
      )}
      <div className="upset__sub">
        ended {king}'s {streak}-win streak!
      </div>
    </div>
  );
}

/** Top 4 revealed one at a time, #4 up to #1, then the playoff banner. */
function BracketReveal({ seeds, m, reduced }: { seeds: (BoardPlayer | undefined)[]; m: BoardModel; reduced: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = [1, 2, 3, 4, 5].map((n) => window.setTimeout(() => setShown(n), n * 1150));
    return () => timers.forEach(clearTimeout);
  }, []);
  const order = [3, 2, 1, 0];
  return (
    <div className="reveal">
      <motion.div className="reveal__title" {...slamIn(reduced)}>
        {shown >= 5 ? '🏆 TOP 4 PLAYOFF 🏆' : 'And the Top 4 are…'}
      </motion.div>
      <div className="reveal__row">
        {order.map((i, n) => {
          const p = seeds[i];
          const on = shown > n;
          return (
            <div key={i} className={`reveal__slot${on ? ' reveal__slot--on' : ''}${i === 0 ? ' reveal__slot--one' : ''}`}>
              <div className="reveal__seed">#{i + 1}</div>
              {on && p ? (
                <motion.div className="reveal__p" {...slamIn(reduced)}>
                  <Avatar player={p} className="avatar--xl" />
                  <span>{p.name}</span>
                  <small>{p.wins} wins</small>
                </motion.div>
              ) : (
                <div className="reveal__q">?</div>
              )}
            </div>
          );
        })}
      </div>
      {shown >= 5 && (
        <div className="reveal__sub">
          Semis: #1 vs #4 and #2 vs #3 · {m.settings.semiBestOf <= 1 ? 'winner advances' : `best of ${m.settings.semiBestOf}`}
        </div>
      )}
    </div>
  );
}

/** Comic hype word (BOOM!, SMASHED!) popping over the board after a win. */
export function HypeWord({ fx, reduced }: { fx: EffectsState; reduced: boolean }) {
  return (
    <AnimatePresence>
      {fx.hype && (
        <motion.div
          key={fx.hype.key}
          className="hype"
          aria-hidden
          initial={reduced ? { opacity: 0 } : { scale: 0.2, rotate: -20, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { scale: 1, rotate: -8, opacity: 1 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 1.4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        >
          {fx.hype.word}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Tickets raining down the whole screen for a big payout. */
export function TicketShower({ fx }: { fx: EffectsState }) {
  if (fx.shower == null) return null;
  return (
    <div className="shower" key={fx.shower} aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.17}s`, animationDuration: `${1.3 + ((i * 7) % 5) * 0.15}s` }}
        >
          🎟️
        </span>
      ))}
    </div>
  );
}

function FinalIntro({ a, b, reduced }: { a?: BoardPlayer; b?: BoardPlayer; reduced: boolean }) {
  const fly = (from: number) =>
    reduced ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : { initial: { x: `${from}vw`, opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 120, damping: 16, delay: 0.25 } };
  return (
    <div className="final-intro">
      <motion.div className="final-intro__title" {...slamIn(reduced)}>
        FINAL
      </motion.div>
      <div className="final-intro__row">
        {a && (
          <motion.div className="final-intro__p" {...fly(-60)}>
            <Avatar player={a} className="avatar--xl" />
            <span>{a.name}</span>
          </motion.div>
        )}
        <div className="final-intro__vs">VS</div>
        {b && (
          <motion.div className="final-intro__p" {...fly(60)}>
            <Avatar player={b} className="avatar--xl" />
            <span>{b.name}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Champion({ m, player, birthday, reduced }: { m: BoardModel; player?: BoardPlayer; birthday: boolean; reduced: boolean }) {
  return (
    <div className="champ-screen">
      <motion.div className="champ-screen__trophy" {...(reduced ? {} : { initial: { y: '-60vh' }, animate: { y: 0 }, transition: { type: 'spring', stiffness: 90, damping: 12 } })}>
        🏆
      </motion.div>
      <motion.div className="champ-screen__banner" {...slamIn(reduced)}>
        {birthday ? '🎂 BIRTHDAY CHAMPION 🎂' : 'CHAMPION!'}
      </motion.div>
      {player && (
        <div className="slam__row">
          <Avatar player={player} className="avatar--xl" />
          <span className="slam__name slam__name--gold">{player.name}</span>
        </div>
      )}
      {!birthday && <div className="champ-screen__at">at {m.settings.title}</div>}
    </div>
  );
}

/** 5-second kickoff after the start tap: lights flicker on, the birthday line slams in, confetti. */
export function Kickoff({ m, reduced, onDone }: { m: BoardModel | null; reduced: boolean; onDone: () => void }) {
  useEffect(() => {
    const boom = window.setTimeout(() => cannons(true), 2600);
    const done = window.setTimeout(onDone, KICKOFF_MS);
    return () => {
      clearTimeout(boom);
      clearTimeout(done);
    };
  }, [onDone]);
  const name = m?.settings.birthdayName ?? 'Ethan';
  return (
    <div className={`kickoff${reduced ? ' kickoff--calm' : ''}`} onClick={onDone}>
      <div className="kickoff__lights" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={{ animationDelay: `${0.2 + i * 0.12}s` }} />
        ))}
      </div>
      <div className="kickoff__text">
        <div className="kickoff__happy">Happy Birthday</div>
        <div className="kickoff__name">{name}!</div>
      </div>
    </div>
  );
}

/** Ticket graphics flying from a name to the ticket column, plus a "+N" pop. */
export function TicketFly({ amount }: { amount: number }) {
  return (
    <span className="ticket-fly" aria-hidden>
      {Array.from({ length: Math.min(4, amount) }, (_, i) => (
        <span key={i} className="ticket-fly__t" style={{ animationDelay: `${i * 0.09}s` }}>
          🎟️
        </span>
      ))}
      <span className="ticket-fly__plus">+{amount}</span>
    </span>
  );
}
