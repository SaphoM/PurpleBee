import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Supabase client (lazy, nullable) ──────────────────────────────────
// Only initialised when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
// Every other module imports `supabase` and guards with `if (supabase)`.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

/** True when a real Supabase connection is configured */
export const isDbConnected = (): boolean => supabase !== null;
