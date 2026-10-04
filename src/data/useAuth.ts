import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface AuthState {
  loading: boolean;
  session: Session | null;
  owner: boolean;
  claimable: boolean;
  recheck: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [who, setWho] = useState({ owner: false, claimable: false });

  async function recheck() {
    const { data } = await supabase.rpc('whoami');
    if (data) setWho({ owner: Boolean(data.owner), claimable: Boolean(data.claimable) });
  }

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session) await recheck();
      setLoading(false);
      // Drop ?code=… left by the magic-link redirect, keep the #route.
      if (new URLSearchParams(location.search).has('code')) {
        history.replaceState(null, '', location.pathname + location.hash);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) void recheck();
      else setWho({ owner: false, claimable: false });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, session, ...who, recheck };
}

export async function sendMagicLink(email: string) {
  const redirect = `${location.origin}${location.pathname}${location.hash || '#/control'}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect, shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}
