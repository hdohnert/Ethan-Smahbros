import { Avatar } from '../ui/Avatar';
import { Bracket } from './Bracket';
import { Hero } from './Hero';
import { Leaderboard } from './Leaderboard';
import type { BoardModel } from './model';
import { Rules } from './Rules';
import { Stage } from './Stage';

export function Board({ m }: { m: BoardModel }) {
  const playoff = m.status === 'playoff' && m.bracket;
  return (
    <div className="board safe">
      <Header m={m} />
      <main className="board__main">
        <section className="board__left">
          {playoff ? (
            <Bracket m={m} />
          ) : (
            <>
              <Stage m={m} />
              <Leaderboard players={m.standings} />
            </>
          )}
        </section>

        <aside className="side">
          {!playoff && (
            <section className="panel upnext">
              <h2 className="panel__title">Up Next</h2>
              <ol className="upnext__list">
                {m.queue.slice(m.status === 'koth' ? 1 : 0, (m.status === 'koth' ? 1 : 0) + 3).map((p, i) => (
                  <li key={p.id} className="upnext__item">
                    <span className="upnext__num">{i + 1}</span>
                    <Avatar player={p} />
                    <span className="upnext__name">{p.name}</span>
                  </li>
                ))}
                {m.queue.length <= (m.status === 'koth' ? 1 : 0) && <li className="upnext__empty">Everyone's played!</li>}
              </ol>
            </section>
          )}
          {playoff && <MiniStandings m={m} />}
          <Rules />
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
