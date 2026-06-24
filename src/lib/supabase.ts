import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Standard Supabase client. supabase-js persists the session in localStorage,
// auto-refreshes the access token before it expires, and injects the current
// Authorization header into every PostgREST/Storage/Realtime request itself —
// so no custom fetch override or manual token tracking is needed.
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

/** True when a real Supabase connection is configured */
export const isDbConnected = (): boolean => supabase !== null;
