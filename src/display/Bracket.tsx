import { Avatar } from '../ui/Avatar';
import type { BoardModel, BoardPlayer, BoardSeries } from './model';

/** Semis on the left feeding the final on the right, with series scores. */
export function Bracket({ m }: { m: BoardModel }) {
  const b = m.bracket!;
  return (
    <section className="panel bracket">
      <div className="bracket__col">
        <SeriesBox s={b.semi1} label="Semifinal 1 · #1 vs #4" live={m.currentSeries === 'semi1'} />
        <SeriesBox s={b.semi2} label="Semifinal 2 · #2 vs #3" live={m.currentSeries === 'semi2'} />
      </div>
      <div className="bracket__lines" aria-hidden>
        <span />
        <span />
      </div>
      <div className="bracket__col bracket__col--final">
        <SeriesBox s={b.final} label="🏆 FINAL" live={m.currentSeries === 'final'} big />
        <div className="bracket__note">Best of 3 · first to 2 wins</div>
      </div>
    </section>
  );
}

function SeriesBox({ s, label, live, big }: { s: BoardSeries; label: string; live: boolean; big?: boolean }) {
  return (
    <div className={`series${live ? ' series--live' : ''}${big ? ' series--big' : ''}`}>
      <div className="series__label">
        {label}
        {live && <span className="series__live">NOW</span>}
      </div>
      <SeriesRow p={s.a} wins={s.winsA} won={!!s.winner && s.winner.id === s.a?.id} lost={!!s.winner && s.winner.id !== s.a?.id} />
      <SeriesRow p={s.b} wins={s.winsB} won={!!s.winner && s.winner.id === s.b?.id} lost={!!s.winner && s.winner.id !== s.b?.id} />
    </div>
  );
}

function SeriesRow({ p, wins, won, lost }: { p: BoardPlayer | null; wins: number; won: boolean; lost: boolean }) {
  return (
    <div className={`series__row${won ? ' series__row--won' : ''}${lost ? ' series__row--lost' : ''}`}>
      {p ? <Avatar player={p} /> : <span className="avatar avatar--tbd">?</span>}
      <span className="series__name">{p?.name ?? 'TBD'}</span>
      <span className="series__pips">
        {[0, 1].map((i) => (
          <span key={i} className={`pip${i < wins ? ' pip--on' : ''}`} />
        ))}
      </span>
    </div>
  );
}
