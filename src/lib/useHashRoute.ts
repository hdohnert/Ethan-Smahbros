import { useEffect, useState } from 'react';

/** Hash routing ("#/display?t=…") so GitHub Pages needs no server rewrites. Returns [route, fullHash]. */
export function useHashRoute(): [string, string] {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return [hash.replace(/^#\/?/, '').split('?')[0], hash];
}
