import { Avatar } from '../ui/Avatar';
import { Bracket } from './Bracket';
import { Hero } from './Hero';
import { Leaderboard } from './Leaderboard';
import type { EffectsState } from '../effects/useEffectsEngine';
import type { BoardModel } from './model';
import { Rules } from './Rules';
import { Stage } from './Stage';

export function Board({ m, fx }: { m: BoardModel; fx?: EffectsState }) {
  const playoff = m.status === 'playoff' && m.bracket;
  return (
    <div className="board safe">
      <Header m={m} />
      <main className="board__main">
        <section className="board__left">
          {playoff ? (
            <Bracket m={m} fx={fx} />
          ) : (
            <>
              <Stage m={m} fx={fx} />
              <Leaderboard players={m.standings} fx={fx} />
            </>
          )}
        </section>

        <aside className="side">
          {!playoff && <UpNext m={m} />}
          {playoff && <MiniStandings m={m} />}
          <Rules format={m.format} semiBestOf={m.settings.semiBestOf} finalBestOf={m.settings.finalBestOf} />
        </aside>
      </main>
    </div>
  );
}

export function Header({ m }: { m: BoardModel }) {
  return (
    <header className="header">
      <Hero m={m} />
      <div className="header__titles">
        <h1 className="header__title">{m.settings.title}</h1>
        <div className="header__sub">{m.settings.subtitle}</div>
      </div>
      <div className="phase-pill">{m.phaseLabel}</div>
    </header>
  );
}

function MiniStandings({ m }: { m: BoardModel }) {
  return (
    <section className="panel upnext">
      <h2 className="panel__title">Most Wins</h2>
      <ol className="upnext__list">
        {m.standings.slice(0, 3).map((p, i) => (
          <li key={p.id} className="upnext__item">
            <span className="upnext__num">{i + 1}</span>
            <Avatar player={p} />
            <span className="upnext__name">{p.name}</span>
            <span className="upnext__wins">{p.wins}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 1v1: the next three kids. 4-player: the next group of 3, as one match. */
function UpNext({ m }: { m: BoardModel }) {
  const playing = m.status === 'koth' ? m.challengers.length : 0;
  const group = m.format === '4-player' && playing > 1;
  const next = m.queue.slice(playing, playing + 3);
  return (
    <section className={`panel upnext${group ? ' upnext--group' : ''}`}>
      <h2 className="panel__title">{group ? 'Next Match' : 'Up Next'}</h2>
      <ol className="upnext__list">
        {next.map((p, i) => (
          <li key={p.id} className="upnext__item">
            {!group && <span className="upnext__num">{i + 1}</span>}
            <Avatar player={p} />
            <span className="upnext__name">{p.name}</span>
          </li>
        ))}
        {next.length === 0 && <li className="upnext__empty">Everyone's up!</li>}
      </ol>
    </section>
  );
}
