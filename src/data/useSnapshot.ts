import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { replay } from '../rules/replay';
import type { Derived, RulesEvent } from '../rules/types';
import { supabase } from './supabase';
import { replayOptions, withDefaults, type Snapshot } from './types';

export type Source = { kind: 'owner' } | { kind: 'token'; token: string };

export interface Live {
  snap: Snapshot | null;
  derived: Derived | null;
  balances: Record<string, number>;
  /** false while we can't reach Supabase; the last known state stays on screen. */
  online: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TABLES = ['app_state', 'players', 'tournaments', 'match_events', 'ticket_events'];

function cacheKey(src: Source) {
  return src.kind === 'owner' ? 'snap:owner' : `snap:${src.token.slice(0, 8)}`;
}

function readCache(src: Source): Snapshot | null {
  try {
    const raw = localStorage.getItem(cacheKey(src));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

/**
 * Loads get_snapshot and keeps it fresh: Control listens to table changes,
 * the TV listens to its token's broadcast topic, and both poll as a backstop.
 */
export function useSnapshot(src: Source | null): Live {
  const [snap, setSnap] = useState<Snapshot | null>(() => (src ? readCache(src) : null));
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const srcKey = src ? (src.kind === 'owner' ? 'owner' : src.token) : null;
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const load = useCallback(async () => {
    if (!src) return;
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const run = (async () => {
      do {
        again.current = false;
        const { data, error: err } = await supabase.rpc('get_snapshot', {
          p_token: src.kind === 'token' ? src.token : null,
        });
        if (err) {
          setOnline(false);
          setError(err.message);
        } else {
          const s = data as Snapshot;
          s.settings = withDefaults(s.settings);
          setSnap(s);
          setOnline(true);
          setError(null);
          try {
            localStorage.setItem(cacheKey(src), JSON.stringify(s));
          } catch {
            /* storage full or blocked: fine */
          }
        }
      } while (again.current);
    })();
    inflight.current = run;
    try {
      await run;
    } finally {
      inflight.current = null;
    }
    // srcKey captures src identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcKey]);

  useEffect(() => {
    if (!src) return;
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 120);
    };

    const channel =
      src.kind === 'owner'
        ? TABLES.reduce(
            (ch, table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, soon),
            supabase.channel('control-live'),
          )
        : supabase.channel(`display:${src.token}`, { config: { private: false } }).on('broadcast', { event: 'changed' }, soon);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setOnline(true);
        void load(); // catch anything missed while disconnected
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setOnline(false);
      }
    });

    void load();
    const poll = window.setInterval(() => void load(), src.kind === 'owner' ? 20000 : 15000);
    const onFocus = () => document.visibilityState === 'visible' && void load();
    const onOnline = () => void load();
    const onOffline = () => setOnline(false);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcKey, load]);

  const derived = useMemo(
    () => (snap ? replay(snap.tournament, snap.players, snap.events as RulesEvent[], replayOptions(snap.settings)) : null),
    [snap],
  );
  const balances = useMemo(
    () => Object.fromEntries((snap?.balances ?? []).map((b) => [b.player_id, b.balance])),
    [snap],
  );

  return { snap, derived, balances, online, error, refresh: load };
}
