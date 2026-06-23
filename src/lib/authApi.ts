import type { User as SupabaseUser } from '@supabase/supabase-js';
import { setSupabaseToken } from './supabase';

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

// ── In-memory session ─────────────────────────────────────────────────────────
// Survives navigation within the SPA but is cleared on hard reload
// (the refresh route picks it back up from the httpOnly cookie).
export interface StoredSession {
  access_token: string;
  expires_in: number;
  user: SupabaseUser;
}
let _session: StoredSession | null = null;

export const getStoredSession = () => _session;
export const getCurrentUserId = (): string | null =>
  (_session?.user?.id as string) ?? null;

// ── Refresh timer ─────────────────────────────────────────────────────────────
// Silently refreshes 5 minutes before the access token expires so the user
// never hits a 401 mid-session.
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(expiresIn: number) {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  const delay = Math.max((expiresIn - 300) * 1000, 60_000);
  _refreshTimer = setTimeout(() => silentRefresh().catch(() => {}), delay);
}

function applySession(data: StoredSession) {
  _session = data;
  setSupabaseToken(data.access_token);
  scheduleRefresh(data.expires_in ?? 3600);
}

function clearSession() {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = null;
  _session = null;
  setSupabaseToken(null);
}

// ── Core auth calls ───────────────────────────────────────────────────────────

/**
 * Exchange email + password for an access token.
 * The backend sets the refresh token in an httpOnly cookie — JS never sees it.
 */
export async function loginViaServer(email: string, password: string): Promise<StoredSession> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err.error as string) || 'Login failed');
  }
  const data = await res.json();
  applySession(data);
  return data;
}

/**
 * Use the httpOnly refresh-token cookie to silently get a new access token.
 * Called automatically by the timer and on app startup (page refresh).
 * Returns null when the refresh token is absent or expired.
 */
export async function silentRefresh(): Promise<StoredSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = await res.json();
    applySession(data);
    return data;
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Revoke the session server-side and clear the refresh cookie.
 * The access token is sent so Supabase can invalidate it immediately.
 */
export async function logoutViaServer(): Promise<void> {
  const token = _session?.access_token;
  clearSession();
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => {});
}

// ── fetchWithAuth ─────────────────────────────────────────────────────────────
/**
 * Drop-in replacement for fetch() that injects the current access token and
 * handles a single 401 → silent-refresh → retry cycle.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const bearerHeader = (t: string | null): Record<string, string> =>
    t ? { Authorization: `Bearer ${t}` } : {};

  const merge = (token: string | null) => ({
    ...options,
    credentials: 'include' as RequestCredentials,
    headers: {
      ...(options.headers as Record<string, string>),
      ...bearerHeader(token),
    },
  });

  let res = await fetch(url, merge(_session?.access_token ?? null));

  if (res.status === 401) {
    const refreshed = await silentRefresh();
    res = await fetch(url, merge(refreshed?.access_token ?? null));
  }

  return res;
}
