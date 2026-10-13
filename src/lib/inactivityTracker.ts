/**
 * Cross-tab inactivity tracker using BroadcastChannel API with localStorage fallback.
 *
 * Coordinates between tabs of the same application origin so that inactivity
 * warnings and other events are not displayed more than once across open tabs.
 *
 * Design notes:
 * - The single source of truth for "last meaningful activity" is the
 *   localStorage timestamp, so refreshing a tab never resets the calculation.
 * - BroadcastChannel delivers events to OTHER tabs of the same origin (never
 *   back to the sender), so there is no echo loop. The storage event fallback
 *   behaves the same way (fired only in tabs that did not write the key).
 * - Every cross-tab notification carries a stable event id; tabs persist the
 *   ids they have already displayed (localStorage) so a refreshed or newly
 *   opened tab cannot replay an old notification.
 * - The coordinator is disposed on unmount: the BroadcastChannel is closed
 *   and the storage listener removed.
 */

import React from 'react';

const STORAGE_ACTIVITY_KEY = 'purplebee-inactivity-activity';
const STORAGE_SEEN_EVENTS_KEY = 'purplebee-inactivity-seen-events';
const CHANNEL_NAME = 'purplebee-inactivity';

export type InactivityState =
  | 'recently-active'
  | 'activity-slowing'
  | 'extended-inactive'
  | 'inactive-most-of-day'
  | 'prolonged-inactive';

export interface InactivityThresholds {
  recentlyActiveMinutes: number;
  activitySlowingMinutes: number;
  extendedInactiveMinutes: number;
  inactiveMostOfDayMinutes: number;
  prolongedInactiveMinutes: number;
}

interface CrossTabEvent {
  /** Stable identifier used for cross-tab deduplication. */
  eventId: string;
  state: InactivityState;
  durationMinutes: number;
  lastActivity: number;
}

type CrossTabListener = (event: CrossTabEvent) => void;

export interface InactivityTrackerOptions {
  thresholds?: Partial<InactivityThresholds>;
  /**
   * Called when the inactivity state changes. `isNewForThisTab` is false when
   * the change was announced by another tab and already displayed there, so
   * this tab can skip showing a duplicate toast.
   */
  onInactivityChange?: (
    durationMinutes: number,
    state: InactivityState,
    isNewForThisTab: boolean
  ) => void;
}

// Default thresholds (configurable via options.thresholds)
const defaultThresholds: InactivityThresholds = {
  recentlyActiveMinutes: 60,       // Less than 1 hour: Recently active
  activitySlowingMinutes: 240,     // 1-4 hours: Activity slowing down
  extendedInactiveMinutes: 480,    // 4-8 hours: Extended inactivity
  inactiveMostOfDayMinutes: 960,   // 8-24 hours: Inactive for most of the day
  prolongedInactiveMinutes: 1440,  // More than 24 hours: Prolonged inactivity
};

/** Determines the inactivity state based on elapsed minutes. */
function determineState(minutes: number, thresholds: InactivityThresholds): InactivityState {
  if (minutes < thresholds.recentlyActiveMinutes) return 'recently-active';
  if (minutes < thresholds.activitySlowingMinutes) return 'activity-slowing';
  if (minutes < thresholds.extendedInactiveMinutes) return 'extended-inactive';
  if (minutes < thresholds.inactiveMostOfDayMinutes) return 'inactive-most-of-day';
  return 'prolonged-inactive';
}

/** Converts minutes to a human-readable duration string. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    const m = Math.max(1, Math.round(minutes));
    return m <= 1 ? '1 minute ago' : `${m} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (m === 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${hours} hour${hours > 1 ? 's' : ''} ${m} min ago`;
}

function readStoredActivity(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVITY_KEY);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Keeps the last N deduplication event ids so a refreshed/new tab can tell
 * which inactivity notifications have already been shown somewhere.
 */
function rememberSeenEvent(eventId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_SEEN_EVENTS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (list.includes(eventId)) return;
    list.push(eventId);
    localStorage.setItem(STORAGE_SEEN_EVENTS_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* storage unavailable — dedup degrades gracefully */
  }
}

function hasSeenEvent(eventId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_SEEN_EVENTS_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(eventId);
  } catch {
    return false;
  }
}

/**
 * Record a meaningful action from anywhere in the app (task created /
 * updated / deleted, upload, login) without mounting the hook. Persists the
 * timestamp so refreshes keep it, and tells other tabs to reset as well.
 */
export function recordMeaningfulActivity(): void {
  try {
    const now = Date.now();
    localStorage.setItem(STORAGE_ACTIVITY_KEY, String(now));
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({
        eventId: `inactivity:reset:${now}`,
        state: 'recently-active',
        durationMinutes: 0,
        lastActivity: now,
      });
      channel.close();
    }
  } catch {
    /* storage/broadcast unavailable — local timestamp still updated above */
  }
}

/**
 * Cross-tab coordinator using BroadcastChannel with a localStorage storage
 * event fallback. Handles deduplication and state synchronisation between
 * tabs of the same origin.
 */
class CrossTabCoordinator {
  private channel: BroadcastChannel | null = null;
  private listeners: CrossTabListener[] = [];
  private storageHandler: ((e: StorageEvent) => void) | null = null;
  private disposed = false;

  constructor(private thresholds: InactivityThresholds) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (e: MessageEvent) => this.handleEvent(e.data);
      } catch {
        this.channel = null;
      }
    }

    // localStorage fallback: fires in tabs that did NOT write the key,
    // so it never echoes back to the sender either.
    this.storageHandler = (e: StorageEvent) => {
      if (e.key !== STORAGE_ACTIVITY_KEY || !e.newValue) return;
      const lastActivity = parseInt(e.newValue, 10);
      if (!Number.isFinite(lastActivity)) return;
      this.handleEvent(this.buildEvent(lastActivity));
    };
    window.addEventListener('storage', this.storageHandler);
  }

  /** Tear down browser resources — called from the hook's effect cleanup. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.channel) {
      try {
        this.channel.onmessage = null;
        this.channel.close();
      } catch { /* already closed */ }
      this.channel = null;
    }
    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    this.listeners = [];
  }

  private buildEvent(lastActivity: number): CrossTabEvent {
    const durationMinutes = Math.max(0, Math.floor((Date.now() - lastActivity) / 60000));
    const state = determineState(durationMinutes, this.thresholds);
    // Stable id: one per (state, activity timestamp) pair — a refresh or a
    // second tab computing the same condition yields the same id, so it is
    // only ever announced once.
    return {
      eventId: `inactivity:${state}:${lastActivity}`,
      state,
      durationMinutes,
      lastActivity,
    };
  }

  private handleEvent(data: unknown): void {
    if (this.disposed) return;
    if (!data || typeof data !== 'object') return;
    const event = data as CrossTabEvent;
    if (typeof event.eventId !== 'string' || typeof event.lastActivity !== 'number') return;
    this.listeners.forEach((listener) => listener(event));
  }

  /** Subscribe to cross-tab events. Returns an unsubscribe function. */
  subscribe(listener: CrossTabListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Record a meaningful activity now: persists the timestamp (so refreshes
   * keep it), marks any pending inactivity events as handled in this tab,
   * and tells other tabs so they reset too.
   */
  recordActivity(): { lastActivity: number; durationMinutes: number; state: InactivityState } {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_ACTIVITY_KEY, String(now));
    } catch { /* storage unavailable — in-memory only */ }
    const state = determineState(0, this.thresholds);
    // Acting on the app implicitly acknowledges current inactivity notices.
    rememberSeenEvent(`inactivity:${state}:${now}`);
    const event: CrossTabEvent = {
      eventId: `inactivity:reset:${now}`,
      state,
      durationMinutes: 0,
      lastActivity: now,
    };
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch { /* channel closed mid-flight */ }
    }
    return { lastActivity: now, durationMinutes: 0, state };
  }

  /**
   * Announce a threshold crossing to other tabs. The event id is derived
   * from (state, lastActivity), so whoever announces first owns the notice
   * — every other tab finds it already marked as seen and stays quiet.
   */
  announce(snapshot: { state: InactivityState; durationMinutes: number; lastActivity: number }): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage({
        eventId: `inactivity:${snapshot.state}:${snapshot.lastActivity}`,
        state: snapshot.state,
        durationMinutes: snapshot.durationMinutes,
        lastActivity: snapshot.lastActivity,
      } satisfies CrossTabEvent);
    } catch { /* channel closed mid-flight */ }
  }

  /** Current state derived from the persisted timestamp. */
  getState(): { lastActivity: number; durationMinutes: number; state: InactivityState } {
    const lastActivity = readStoredActivity() ?? Date.now();
    const durationMinutes = Math.max(0, Math.floor((Date.now() - lastActivity) / 60000));
    const state = determineState(durationMinutes, this.thresholds);
    return { lastActivity, durationMinutes, state };
  }

  /** Marks an event id as displayed in this tab (dedup across tabs). */
  markSeen(eventId: string): void {
    rememberSeenEvent(eventId);
  }

  /** True when another tab already displayed this event. */
  seen(eventId: string): boolean {
    return hasSeenEvent(eventId);
  }
}

export interface InactivityTracker {
  /** Last meaningful activity timestamp (persisted across refreshes). */
  lastActivity: Date;
  /** Whole minutes of inactivity at the time of the last recalculation. */
  inactivityDuration: number;
  /** Human-readable inactivity, e.g. "3 hours 20 min ago". */
  inactivityString: string;
  currentState: InactivityState;
  isInactive: boolean;
  minutesSinceActivity: number;
  /** Record a meaningful user action (resets the inactivity clock, all tabs). */
  recordActivity: () => void;
  getState: () => { lastActivity: Date; durationMinutes: number; state: InactivityState; isInactive: boolean };
  isState: (test: InactivityState) => boolean;
}

/**
 * Hook that provides inactivity tracking with cross-tab coordination.
 *
 * - Recalculates elapsed time on every render and at least once a minute,
 *   even when no new database record is created.
 * - Reads the persisted timestamp, so a page refresh does not reset it.
 * - Coordinates with other tabs via BroadcastChannel (localStorage storage
 *   events as fallback) and deduplicates threshold notifications by event id.
 * - Cleans up its channel/listener on unmount.
 */
export function useInactivityTracker(
  options: InactivityTrackerOptions = {}
): InactivityTracker {
  const { thresholds, onInactivityChange } = options;
  const mergedThresholds = { ...defaultThresholds, ...thresholds };

  const coordinatorRef = React.useRef<CrossTabCoordinator | null>(null);
  const callbackRef = React.useRef(onInactivityChange);
  callbackRef.current = onInactivityChange;
  const lastStateRef = React.useRef<InactivityState | null>(null);

  // Recompute on an interval so durations advance while the tab stays open
  // (background tabs are throttled to ~1 min, which is still accurate enough
  // for hour-based intervals; on return we recompute from the timestamp).
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const coordinator = new CrossTabCoordinator(mergedThresholds);
    coordinatorRef.current = coordinator;
    lastStateRef.current = coordinator.getState().state;

    // Events from other tabs: refresh local state; announce-to-callback only
    // when this tab has not already handled that event id (dedup).
    const unsubscribe = coordinator.subscribe((event) => {
      if (event.eventId.startsWith('inactivity:reset:')) {
        lastStateRef.current = event.state;
        setTick((t) => t + 1);
        return;
      }
      const isNew = !coordinator.seen(event.eventId);
      if (isNew) coordinator.markSeen(event.eventId);
      lastStateRef.current = event.state;
      setTick((t) => t + 1);
      callbackRef.current?.(event.durationMinutes, event.state, isNew);
    });

    // Local threshold detection, run on every tick (1/min) and on resume.
    const detectLocal = () => {
      const snapshot = coordinator.getState();
      if (snapshot.state === lastStateRef.current) return;
      lastStateRef.current = snapshot.state;
      setTick((t) => t + 1);
      if (snapshot.state === 'recently-active') return; // recovery — no notice
      const eventId = `inactivity:${snapshot.state}:${snapshot.lastActivity}`;
      const isNew = !coordinator.seen(eventId);
      if (isNew) {
        coordinator.markSeen(eventId);
        coordinator.announce(snapshot);
      }
      callbackRef.current?.(snapshot.durationMinutes, snapshot.state, isNew);
    };

    // Establish/refresh this tab's baseline so an open tab participates in
    // cross-tab state without pretending the user just became active.
    if (readStoredActivity() === null) coordinator.recordActivity();
    detectLocal();

    const interval = setInterval(detectLocal, 60_000);

    // Recalculate from the persisted timestamp when the tab becomes visible
    // again (timers are throttled while hidden).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') detectLocal();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubscribe();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      coordinator.dispose();
      coordinatorRef.current = null;
      lastStateRef.current = null;
    };
    // Thresholds are a fresh object each render; rebuild only when the
    // caller-supplied values actually change identity.
  }, [thresholds]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordActivity = React.useCallback(() => {
    coordinatorRef.current?.recordActivity();
    lastStateRef.current = 'recently-active';
    setTick((t) => t + 1);
  }, []);

  const snapshot = coordinatorRef.current?.getState() ?? {
    lastActivity: Date.now(),
    durationMinutes: 0,
    state: 'recently-active' as InactivityState,
  };
  const minutesSinceActivity = Math.max(
    0,
    Math.floor((Date.now() - snapshot.lastActivity) / 60000)
  );

  return {
    lastActivity: new Date(snapshot.lastActivity),
    inactivityDuration: snapshot.durationMinutes,
    inactivityString: formatDuration(snapshot.durationMinutes),
    currentState: snapshot.state,
    isInactive: snapshot.state !== 'recently-active',
    minutesSinceActivity,
    recordActivity,
    getState: () => ({
      lastActivity: new Date(snapshot.lastActivity),
      durationMinutes: snapshot.durationMinutes,
      state: snapshot.state,
      isInactive: snapshot.state !== 'recently-active',
    }),
    isState: (test) => snapshot.state === test,
  };
}
