import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// "Remember me" support: supabase-js fixes its storage backend at
// createClient() time — there's no per-sign-in override — so a single
// client with a custom storage adapter that delegates to localStorage
// (persists across browser restarts) or sessionStorage (cleared when the
// tab/browser closes, not shared with other tabs) based on this flag is
// the standard way to support it without running two GoTrueClient
// instances. setRememberMe is called from loginWithEmail right before
// sign-in; it defaults to true so behavior is unchanged until a user
// explicitly unchecks the box.
let rememberMe = true;
export function setRememberMe(value: boolean): void {
  rememberMe = value;
}

const dynamicAuthStorage = {
  getItem: (k: string) => localStorage.getItem(k) ?? sessionStorage.getItem(k),
  setItem: (k: string, v: string) => {
    if (rememberMe) {
      localStorage.setItem(k, v);
      sessionStorage.removeItem(k);
    } else {
      sessionStorage.setItem(k, v);
      localStorage.removeItem(k);
    }
  },
  removeItem: (k: string) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  },
};

// Standard Supabase client. supabase-js persists the session (via the
// storage adapter above), auto-refreshes the access token before it
// expires, and injects the current Authorization header into every
// PostgREST/Storage/Realtime request itself — so no custom fetch override
// or manual token tracking is needed.
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: dynamicAuthStorage,
        },
      })
    : null;

/** True when a real Supabase connection is configured */
export const isDbConnected = (): boolean => supabase !== null;
