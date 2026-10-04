import { theme } from '../theme';
import type { BoardPlayer } from './sampleData';
import { Hero } from './Hero';
import { Leaderboard } from './Leaderboard';
import { Rules } from './Rules';
import { Stage } from './Stage';

interface Props {
  players: BoardPlayer[];
  match: {
    phase: string;
    king: BoardPlayer;
    challenger: BoardPlayer;
    queue: BoardPlayer[];
  };
}

export function Board({ players, match }: Props) {
  return (
    <div className="board safe">
      <header className="header">
        <Hero />
        <div className="header__titles">
          <h1 className="header__title">{theme.title}</h1>
          <div className="header__sub">{theme.subtitle}</div>
        </div>
        <div className="phase-pill">{match.phase}</div>
      </header>

      <main className="board__main">
        <section className="board__left">
          <Stage king={match.king} challenger={match.challenger} />
          <Leaderboard players={players} />
        </section>

        <aside className="side">
          <section className="panel upnext">
            <h2 className="panel__title">Up Next</h2>
            <ol className="upnext__list">
              {match.queue.slice(0, 3).map((p, i) => (
                <li key={p.id} className="upnext__item">
                  <span className="upnext__num">{i + 1}</span>
                  <Avatar player={p} />
                  <span className="upnext__name">{p.name}</span>
                </li>
              ))}
            </ol>
          </section>
          <Rules />
        </aside>
      </main>
    </div>
  );
}

export function Avatar({ player, size = 'md' }: { player: BoardPlayer; size?: 'md' | 'lg' }) {
  return (
    <span className={`avatar avatar--${size}`} style={{ background: player.avatar.color }} aria-hidden>
      {player.avatar.emoji ?? player.name.charAt(0).toUpperCase()}
    </span>
  );
}
