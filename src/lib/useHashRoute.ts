import { useEffect, useState } from 'react';

/** Hash routing ("#/display") so GitHub Pages needs no server rewrites. */
export function useHashRoute(): string {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('?')[0];
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
