import { Component, type ReactNode } from 'react';

const RELOADED = 'showdown-reloaded-at';

/** A file from an older version of the app is gone after an update. */
const isStaleChunk = (e: unknown) =>
  /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically|ChunkLoadError/i.test(String((e as Error)?.message ?? e));

/** Unregister the offline cache and load the newest version of the app. */
export async function hardReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = (await window.caches?.keys()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* reload anyway */
  }
  location.reload();
}

/**
 * Instead of a black screen: after an app update, reload once by itself;
 * otherwise show what went wrong with a button to reload.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(RELOADED) ?? 0);
    } catch {
      /* private mode */
    }
    if (isStaleChunk(error) && Date.now() - last > 60_000) {
      try {
        sessionStorage.setItem(RELOADED, String(Date.now()));
      } catch {
        /* private mode */
      }
      void hardReload();
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash">
        <h1>Oops, something went wrong</h1>
        <p>Tap the button to load the newest version. Your scores and tickets are safe.</p>
        <button className="crash__btn" onClick={() => void hardReload()}>
          Reload the app
        </button>
        <pre className="crash__msg">{String((error as Error)?.message ?? error)}</pre>
      </div>
    );
  }
}
