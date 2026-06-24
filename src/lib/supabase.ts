import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Token ref ─────────────────────────────────────────────────────────────────
// Holds the current access token in memory so the global fetch override can
// inject it into every supabase.from() call.  Set by authApi after login/refresh.
// Falls back gracefully: if null, Supabase's own session (from localStorage) is
// used instead — keeping the app functional on page reload.
const _tokenRef = { current: null as string | null };
export const setSupabaseToken = (t: string | null) => { _tokenRef.current = t; };
export const getSupabaseToken = () => _tokenRef.current;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          // Use default localStorage so the session survives page refreshes.
          // The httpOnly cookie layer (backend proxy) adds security on top when
          // the Express server is running; this keeps the app working when it isn't.
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          // Inject the in-memory token when present (backend proxy path).
          // When null, Supabase's own Authorization header (from its localStorage
          // session) passes through untouched, so page-refresh sessions still work.
          fetch: (fetchUrl: RequestInfo | URL, options: RequestInit = {}) => {
            const token = _tokenRef.current;
            if (!token) return fetch(fetchUrl, options);
            const headers: Record<string, string> = {};
            if (options.headers instanceof Headers) {
              options.headers.forEach((v, k) => { headers[k] = v; });
            } else if (options.headers) {
              Object.assign(headers, options.headers);
            }
            headers['Authorization'] = `Bearer ${token}`;
            return fetch(fetchUrl, { ...options, headers });
          },
        },
      })
    : null;

/** True when a real Supabase connection is configured */
export const isDbConnected = (): boolean => supabase !== null;
