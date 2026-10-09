import { lazy, Suspense, useEffect } from 'react';
import { DisplayView } from './display/DisplayView';
import { isStandalone } from './lib/screen';
import { useHashRoute } from './lib/useHashRoute';

// Phone views load on demand so the TV only downloads what it shows.
const ControlApp = lazy(() => import('./control/ControlApp').then((m) => ({ default: m.ControlApp })));
const StationView = lazy(() => import('./station/StationView').then((m) => ({ default: m.StationView })));
const PrizeStoreView = lazy(() => import('./station/PrizeStoreView').then((m) => ({ default: m.PrizeStoreView })));
import { theme } from './theme';
import { store } from './ui/device';

const ROLES = ['display', 'trivia', 'control', 'station', 'prizes'];

export function App() {
  const [route, hash] = useHashRoute();

  // Each home-screen install has its own storage, so remember which view this
  // install is for and reopen it when launched from the icon.
  useEffect(() => {
    if (ROLES.includes(route)) store('role', route);
    else if (route === '' && isStandalone()) {
      const role = store('role');
      if (role && ROLES.includes(role)) location.hash = `#/${role}`;
    }
  }, [route]);

  if (route === 'display') return <DisplayView key={hash} />;
  if (route === 'trivia') return <DisplayView key={hash} trivia />;
  return (
    <Suspense fallback={<div className="crash crash--loading">Loading…</div>}>
      {route === 'control' ? <ControlApp /> : route === 'station' ? <StationView /> : route === 'prizes' ? <PrizeStoreView /> : <Home />}
    </Suspense>
  );
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
          📱 Control <small>keep score (owner)</small>
        </a>
        <a className="home__btn" href="#/station">
          🎯 Game Station <small>helpers award tickets</small>
        </a>
        <a className="home__btn" href="#/prizes">
          🎁 Prize Store <small>spend tickets</small>
        </a>
      </nav>
    </main>
  );
}
