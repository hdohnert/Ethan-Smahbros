import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import type { EffectsState } from '../effects/useEffectsEngine';
import type { BoardModel, BoardPlayer, BoardSeries } from './model';

/** Semis on the left feeding the final on the right, with series scores. */
/** Builds in box by box; a series winner slides into the final slot. */
export function Bracket({ m, fx }: { m: BoardModel; fx?: EffectsState }) {
  const b = m.bracket!;
  return (
    <section className="panel bracket">
      <motion.div className="bracket__col" initial={{ opacity: 0, x: '-6vw' }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <SeriesBox s={b.semi1} label="Semifinal 1 · #1 vs #4" live={m.currentSeries === 'semi1'} fx={fx} />
        <SeriesBox s={b.semi2} label="Semifinal 2 · #2 vs #3" live={m.currentSeries === 'semi2'} fx={fx} />
      </motion.div>
      <motion.div className="bracket__lines" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}>
        <span />
        <span />
      </motion.div>
      <motion.div
        className="bracket__col bracket__col--final"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <SeriesBox s={b.final} label="🏆 FINAL" live={m.currentSeries === 'final'} big fx={fx} slideIn />
        <div className="bracket__note">Best of 3 · first to 2 wins</div>
      </motion.div>
    </section>
  );
}

function SeriesBox({
  s,
  label,
  live,
  big,
  fx,
  slideIn,
}: {
  s: BoardSeries;
  label: string;
  live: boolean;
  big?: boolean;
  fx?: EffectsState;
  slideIn?: boolean;
}) {
  const ko = (p: BoardPlayer | null) => !!p && !!fx?.flashing.has(p.id);
  return (
    <div className={`series${live ? ' series--live' : ''}${big ? ' series--big' : ''}`}>
      <div className="series__label">
        {label}
        {live && <span className="series__live">NOW</span>}
      </div>
      <SeriesRow p={s.a} wins={s.winsA} won={!!s.winner && s.winner.id === s.a?.id} lost={!!s.winner && s.winner.id !== s.a?.id} ko={ko(s.a)} slideIn={slideIn} from={-1} />
      <SeriesRow p={s.b} wins={s.winsB} won={!!s.winner && s.winner.id === s.b?.id} lost={!!s.winner && s.winner.id !== s.b?.id} ko={ko(s.b)} slideIn={slideIn} from={1} />
    </div>
  );
}

function SeriesRow({
  p,
  wins,
  won,
  lost,
  ko,
  slideIn,
  from,
}: {
  p: BoardPlayer | null;
  wins: number;
  won: boolean;
  lost: boolean;
  ko: boolean;
  slideIn?: boolean;
  from: number;
}) {
  return (
    <motion.div
      key={p?.id ?? 'tbd'}
      initial={slideIn && p ? { x: '-22vw', y: `${from * 8}vh`, opacity: 0 } : false}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 140, damping: 18 }}
      className={`series__row${won ? ' series__row--won' : ''}${lost ? ' series__row--lost' : ''}${ko ? ' series__row--ko' : ''}`}
    >
      {p ? <Avatar player={p} /> : <span className="avatar avatar--tbd">?</span>}
      <span className="series__name">{p?.name ?? 'TBD'}</span>
      <span className="series__pips">
        {[0, 1].map((i) => (
          <span key={i} className={`pip${i < wins ? ' pip--on' : ''}`} />
        ))}
      </span>
    </motion.div>
  );
}
