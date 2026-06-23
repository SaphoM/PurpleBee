import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── In-memory storage adapter ─────────────────────────────────────────────────
// Replaces the default localStorage so JWTs never touch the browser's storage
// layer where XSS scripts could steal them.
const _mem: Record<string, string> = {};
const inMemoryStorage = {
  getItem: (k: string) => _mem[k] ?? null,
  setItem: (k: string, v: string) => { _mem[k] = v; },
  removeItem: (k: string) => { delete _mem[k]; },
};

// Current access token — set by authApi after login/refresh.
// Used by the global fetch override so every supabase.from() call carries
// the right Bearer token without needing supabase.auth.setSession().
const _tokenRef = { current: null as string | null };
export const setSupabaseToken = (t: string | null) => { _tokenRef.current = t; };
export const getSupabaseToken = () => _tokenRef.current;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: inMemoryStorage,
          persistSession: true,   // in memory — never touches localStorage
          autoRefreshToken: false, // we handle refresh via the backend cookie
          detectSessionInUrl: true, // still needed for password-recovery links
        },
        global: {
          fetch: (fetchUrl: RequestInfo | URL, options: RequestInit = {}) => {
            const token = _tokenRef.current;
            return fetch(fetchUrl, {
              ...options,
              headers: {
                ...(options.headers as Record<string, string> ?? {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
          },
        },
      })
    : null;

/** True when a real Supabase connection is configured */
export const isDbConnected = (): boolean => supabase !== null;
