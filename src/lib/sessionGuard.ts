import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@stores/userStore';

// ─── Central config — the one place these numbers live ────────────────
// Deliberately not aggressive: a productivity app shouldn't interrupt
// someone mid-task. ~32 minutes of genuine inactivity before logout.
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // idle time before the warning appears
export const SESSION_WARNING_DURATION_MS = 2 * 60 * 1000; // countdown shown before auto-logout
export const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
const ACTIVITY_WRITE_THROTTLE_MS = 5000;
const CHECK_INTERVAL_MS = 5000;
const LAST_ACTIVITY_KEY = 'purplebee-last-activity';

/**
 * Reads the more recent of "my own last-seen activity" and "any other open
 * PurpleBee tab's last-seen activity" (written to localStorage, throttled).
 * This is what makes typing in Tab A also keep Tab B's independent idle
 * timer from firing — reusing the same storage mechanism the app's auth
 * session already depends on, rather than adding a new sync primitive.
 */
function readSharedLastActivity(ownTimestamp: number): number {
  const stored = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  return Math.max(ownTimestamp, stored);
}

export type SessionGuardState = {
  /** True once idle time has crossed INACTIVITY_TIMEOUT_MS and the warning should show. */
  showWarning: boolean;
  /** Seconds left before auto-logout, only meaningful while showWarning is true. */
  secondsRemaining: number;
  /** Call when the user clicks "Continue Working". */
  continueWorking: () => Promise<void>;
};

/**
 * Mounted once from App.tsx, only while authenticated. Tracks real user
 * activity (not just "the tab is open"), shows a warning before logging out
 * a genuinely inactive user, and never interrupts someone who's actually
 * using the app — the idle clock resets on any tracked activity, in this
 * tab or any other open PurpleBee tab.
 */
export function useSessionGuard(enabled: boolean): SessionGuardState {
  const logout = useUserStore((s) => s.logout);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const lastWriteRef = useRef(0);

  const recordActivity = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (now - lastWriteRef.current > ACTIVITY_WRITE_THROTTLE_MS) {
      lastWriteRef.current = now;
      try { localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); } catch { /* storage full/unavailable — activity still tracked in-memory for this tab */ }
    }
  };

  const continueWorking = async () => {
    recordActivity();
    setShowWarning(false);
    if (!supabase) return;
    // getSession() refreshes internally if the access token is stale but
    // the refresh token is still valid — no manual refresh logic needed.
    // A null session here means the token was genuinely revoked/expired
    // server-side, not just idle locally.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      logout('revoked');
    }
  };

  useEffect(() => {
    if (!enabled) return;

    recordActivity();
    const handleActivity = () => {
      // Any tracked activity resets the clock and dismisses the warning
      // immediately (rather than waiting for the next interval tick) —
      // setShowWarning(false) is a harmless no-op when it's already hidden.
      recordActivity();
      setShowWarning(false);
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    const checkIdle = () => {
      const lastActivity = readSharedLastActivity(lastActivityRef.current);
      const idleFor = Date.now() - lastActivity;
      if (idleFor >= INACTIVITY_TIMEOUT_MS + SESSION_WARNING_DURATION_MS) {
        setShowWarning(false);
        logout('inactivity');
        return;
      }
      if (idleFor >= INACTIVITY_TIMEOUT_MS) {
        setShowWarning(true);
        setSecondsRemaining(Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS + SESSION_WARNING_DURATION_MS - idleFor) / 1000)));
      } else {
        setShowWarning(false);
      }
    };

    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS);
    // A tab left open in the background doesn't get to silently skip the
    // clock — the moment it regains focus, recompute immediately instead
    // of waiting for the next tick, so a truly-expired background tab
    // shows the expired state right away rather than looking falsely alive.
    const handleVisibility = () => { if (document.visibilityState === 'visible') checkIdle(); };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { showWarning, secondsRemaining, continueWorking };
}
