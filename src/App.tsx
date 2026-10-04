import { useHashRoute } from './lib/useHashRoute';
import { DisplayView } from './display/DisplayView';
import { theme } from './theme';

export function App() {
  const route = useHashRoute();
  if (route === 'display') return <DisplayView />;
  if (route === 'control') return <ControlPlaceholder />;
  return <Home />;
}

function Home() {
  return (
    <main className="home">
      <h1 className="home__title">{theme.title}</h1>
      <p className="home__sub">{theme.subtitle}</p>
      <nav className="home__nav">
        <a className="home__btn home__btn--tv" href="#/display">
          📺 Display <small>for the TV</small>
        </a>
        <a className="home__btn" href="#/control">
          📱 Control <small>for your phone</small>
        </a>
      </nav>
    </main>
  );
}

function ControlPlaceholder() {
  return (
    <main className="home">
      <h1 className="home__title">Control</h1>
      <p className="home__sub">Scoring arrives in phase 2. For now, test the TV view.</p>
      <nav className="home__nav">
        <a className="home__btn home__btn--tv" href="#/display">
          📺 Open Display
        </a>
      </nav>
    </main>
  );
}
