/** Hours shown compactly across task/analytics cards: 1.5 → "1.5", 2 → "2", 0.008 → "0". */
export const formatHours = (hours: number): string => {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

/** Seconds → "m:ss" (or "h:mm:ss") for the live task timer. */
export const formatDuration = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};

/** Minutes → "1h 30m" / "45m" for toasts. */
export const formatMinutes = (minutes: number): string => {
  const total = Math.round(minutes);
  if (total < 1) return '<1m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

/** Minutes since a started_at timestamp, capped at 12h and never negative. */
export const elapsedMinutesSince = (startedAt: string): number => {
  const raw = (Date.now() - new Date(startedAt).getTime()) / 60000;
  return Math.max(0, Math.min(raw, 12 * 60));
};
