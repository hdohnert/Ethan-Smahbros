import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import config from '../../supabase.config.json';

// The anon/publishable key is designed to be public; row-level security and
// the database functions decide what it can do. Env vars override the file.
const url: string = import.meta.env.VITE_SUPABASE_URL || config.url;
const anonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || config.anonKey;

export const isConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(url || 'http://localhost', anonKey || 'missing-key', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 20 } },
});
