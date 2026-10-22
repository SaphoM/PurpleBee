import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@stores/userStore';

// ─── Central config — the one place these numbers live ────────────────
// Deliberately not aggressive: a productivity app shouldn't interrupt
// someone mid-task. ~32 minutes of genuine inactivity before logout.
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // idle time before the warning appears
export const SESSION_WARNING_DURATION_MS = 2 * 60 * 1000; // countdown shown before auto-logout
// mousemove counts as "still using it": someone reading a long thread or
// reviewing work with the cursor moving (but not clicking/typing) was being
// treated as idle for 30 minutes and then logged out mid-session — exactly
// the "takes me out while I'm still using" report. recordActivity() already
// throttles the localStorage write, so high-frequency mousemove is cheap.
export const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'mousemove', 'touchstart', 'scroll', 'wheel'] as const;
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
  /** When (epoch ms) the current warning episode began — 0 when no warning is active. */
  const warningShownAtRef = useRef(0);

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
    warningShownAtRef.current = 0;
    setShowWarning(false);
    if (!supabase) return;
    // getSession() refreshes internally if the access token is stale but
    // the refresh token is still valid — no manual refresh logic needed.
    // Logout ONLY on a definitive "no session stored" answer (error === null
    // && session === null). An error here is almost always a transient
    // network/refresh hiccup — logging the user out for that was the bug
    // ("PurpleBee takes me out while I'm still using"). If the token is
    // genuinely dead, supabase-js removes the session itself and emits
    // SIGNED_OUT, which userStore already reacts to; we don't second-guess
    // it from a failed read.
    const { data, error } = await supabase.auth.getSession();
    if (error) return; // transient read/refresh failure — keep the user working
    if (!data.session) {
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
      // Any interaction also ends the current warning episode, so the next
      // checkIdle() starts a brand-new countdown only if the user goes idle
      // again — activity and "Continue Working" both fully cancel it.
      recordActivity();
      warningShownAtRef.current = 0;
      setShowWarning(false);
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    const checkIdle = () => {
      const lastActivity = readSharedLastActivity(lastActivityRef.current);
      const idleFor = Date.now() - lastActivity;
      if (idleFor >= INACTIVITY_TIMEOUT_MS) {
        // First crossing of the threshold starts a warning episode with a
        // FRESH countdown — even if the idle spell is already far past the
        // full window (the classic case: the tab sat in the background while
        // the user worked elsewhere, then visibilitychange re-checked the
        // clock). The old code logged out instantly in that case, which is
        // why people got "taken out" the moment they came back. Now they see
        // the countdown and any interaction resets it; only an episode
        // nobody touches runs out to logout('inactivity').
        if (!warningShownAtRef.current) warningShownAtRef.current = Date.now();
        const remainingMs = warningShownAtRef.current + SESSION_WARNING_DURATION_MS - Date.now();
        if (remainingMs <= 0) {
          setShowWarning(false);
          warningShownAtRef.current = 0;
          logout('inactivity');
          return;
        }
        setShowWarning(true);
        setSecondsRemaining(Math.ceil(remainingMs / 1000));
      } else {
        warningShownAtRef.current = 0;
        setShowWarning(false);
      }
    };

    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS);
    // A tab left open in the background doesn't get to silently skip the
    // clock — the moment it regains focus, recompute immediately instead of
    // waiting for the next tick, so a truly-expired background tab shows its
    // warning (with the fresh grace countdown) right away rather than
    // looking falsely alive.
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
