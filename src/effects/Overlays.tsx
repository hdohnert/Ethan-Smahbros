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
    if (e.type === 'newKing') body = <Slam reduced={reduced} kicker="👑 NEW KING 👑" player={get(e.playerId)} />;
    else if (e.type === 'challenger') body = <YoureUp reduced={reduced} players={e.playerIds.map(get).filter((p): p is BoardPlayer => !!p)} />;
    else if (e.type === 'bracket') body = <Slam reduced={reduced} kicker="🏆 TOP 4 PLAYOFF 🏆" title="Best of 3!" />;
    else if (e.type === 'seriesWon') body = <Slam reduced={reduced} kicker="ON TO THE FINAL!" player={get(e.playerId)} />;
    else if (e.type === 'finalIntro') body = <FinalIntro reduced={reduced} a={get(e.a)} b={get(e.b)} />;
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

/** "YOU'RE UP!" with every challenger's name, then 3-2-1-FIGHT! */
function YoureUp({ players, reduced }: { players: BoardPlayer[]; reduced: boolean }) {
  const [step, setStep] = useState(-1);
  useEffect(() => {
    // Three names take a moment longer to read than one.
    const base = players.length > 1 ? 1300 : 900;
    const timers = [0, 450, 900, 1350].map((t, i) => window.setTimeout(() => setStep(i), base + t));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (step < 0 || !players.length) {
    return (
      <motion.div className="slam" {...slamIn(reduced)}>
        <div className="slam__kicker slam__kicker--flash">YOU'RE UP!</div>
        {players.length === 1 ? (
          <div className="slam__row">
            <Avatar player={players[0]} className="avatar--xl" />
            <span className="slam__name">{players[0].name}</span>
          </div>
        ) : (
          <div className="slam__trio">
            {players.map((p) => (
              <div key={p.id} className="slam__trio-p">
                <Avatar player={p} className="avatar--xl" />
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }
  return (
    <motion.div key={step} className={`count${step === 3 ? ' count--fight' : ''}`} {...slamIn(reduced)}>
      {COUNT[step]}
    </motion.div>
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
