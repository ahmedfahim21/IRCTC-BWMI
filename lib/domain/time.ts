/**
 * The whole app thinks in IST. Journey minutes are "minutes past midnight on
 * day 1", so this is the one place that converts them to a real instant.
 */
export const IST_OFFSET_MINUTES = 330;

export function journeyInstant(dateIso: string, minute: number): number {
  return Date.parse(`${dateIso}T00:00:00Z`) - IST_OFFSET_MINUTES * 60000 + minute * 60000;
}

export function minutesSinceJourneyStart(dateIso: string, now: Date): number {
  return (now.getTime() - journeyInstant(dateIso, 0)) / 60000;
}

/** "21:35" for minute 1295, wrapping past midnight. */
export function formatMinute(minute: number | null): string {
  if (minute === null) return "--:--";
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;
}

/** "15h 5m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "47 min late" / "on time" / "12 min early" */
export function formatDelay(delayMins: number): string {
  if (delayMins <= 2 && delayMins >= -2) return "On time";
  if (delayMins < 0) return `${Math.abs(Math.round(delayMins))} min early`;
  const m = Math.round(delayMins);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m late` : `${m} min late`;
}

export function todayIso(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}

export function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateShort(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatWeekday(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
}
