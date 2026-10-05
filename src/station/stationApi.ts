import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../data/supabase';
import type { Prize } from '../data/types';
import { store } from '../ui/device';

export interface RosterPlayer {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  photo_url: string | null;
  balance: number;
}

export interface Roster {
  players: RosterPlayer[];
  prize_store_open: boolean;
  /** Tickets locked for payout (older databases don't send it). */
  frozen?: boolean;
  remaining?: number;
  prizes: Prize[];
  title: string | null;
}

type Res<T> = { ok: true } & T | { ok: false; error: string };

export async function stationCall<T = object>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(/fetch|network/i.test(error.message) ? 'No connection. Try again.' : error.message);
  const res = data as Res<T>;
  if (!res.ok) throw new Error(res.error);
  return res;
}

/** PIN (remembered on this phone) plus the roster, refreshed every 10 s. */
export function useStation() {
  const [pin, setPinState] = useState(() => store('station-pin') ?? '');
  const [roster, setRoster] = useState<Roster | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p = pin) => {
    if (!p) return;
    try {
      const r = await stationCall<Roster>('station_roster', { p_pin: p });
      setRoster(r);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (msg === 'Wrong PIN') {
        store('station-pin', null);
        setPinState('');
        setRoster(null);
      }
    }
  }, [pin]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, [load]);

  const setPin = (p: string) => {
    store('station-pin', p);
    setPinState(p);
    void load(p);
  };
  const signOut = () => {
    store('station-pin', null);
    setPinState('');
    setRoster(null);
  };
  return { pin, setPin, signOut, roster, error, reload: load };
}
