import type { Locale } from "@/lib/i18n/useLocale";

/**
 * The whole app thinks in IST. Journey minutes are "minutes past midnight on
 * day 1", so this is the one place that converts them to a real instant.
 */
export const IST_OFFSET_MINUTES = 330;

/** en -> en-IN, hi -> hi-IN, for everything that hands a locale to Intl. */
const INTL_LOCALE: Record<Locale, string> = { en: "en-IN", hi: "hi-IN" };

export function journeyInstant(dateIso: string, minute: number): number {
  return Date.parse(`${dateIso}T00:00:00Z`) - IST_OFFSET_MINUTES * 60000 + minute * 60000;
}

export function minutesSinceJourneyStart(dateIso: string, now: Date): number {
  return (now.getTime() - journeyInstant(dateIso, 0)) / 60000;
}

/** "21:35" for minute 1295, wrapping past midnight. Digits are locale-neutral. */
export function formatMinute(minute: number | null): string {
  if (minute === null) return "--:--";
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;
}

/**
 * "15h 5m". The h/m suffixes stay in Latin script in both locales — like km,
 * kg or %, they read as units rather than words, and every real Hindi transit
 * product (Ola, Rapido, IRCTC's own site) leaves them alone rather than
 * spelling out घंटा/मिनट in a duration badge sized for two characters.
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "47 min late" / "on time" / "12 min early" */
export function formatDelay(delayMins: number, locale: Locale = "en"): string {
  if (delayMins <= 2 && delayMins >= -2) return locale === "hi" ? "समय पर" : "On time";
  if (delayMins < 0) {
    const m = Math.abs(Math.round(delayMins));
    return locale === "hi" ? `${m} मिनट पहले` : `${m} min early`;
  }
  const m = Math.round(delayMins);
  if (locale === "hi") {
    return m >= 60 ? `${Math.floor(m / 60)}घं ${m % 60}मि देरी से` : `${m} मिनट देरी से`;
  }
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m late` : `${m} min late`;
}

export function todayIso(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}

/** Whole days from one ISO date to another. Negative when `to` is earlier. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000);
}

export function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * "29 Aug" / "29 अग॰". ICU already carries real Hindi month names — ऑगस्ट,
 * सितंबर and so on — so this is a locale switch, not a translation table.
 */
export function formatDateShort(dateIso: string, locale: Locale = "en"): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.toLocaleDateString(INTL_LOCALE[locale], { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatWeekday(dateIso: string, locale: Locale = "en"): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.toLocaleDateString(INTL_LOCALE[locale], { weekday: "short", timeZone: "UTC" });
}

export function formatMonthShort(dateIso: string, locale: Locale = "en"): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.toLocaleDateString(INTL_LOCALE[locale], { month: "short", timeZone: "UTC" });
}

/** Single-letter day-of-week markers for a runs-on-these-days row. */
export const DAY_LETTERS: Record<Locale, string[]> = {
  en: ["S", "M", "T", "W", "T", "F", "S"],
  hi: ["र", "सो", "मं", "बु", "गु", "शु", "श"],
};

/*
 * 2024-01-01 was a Monday in UTC — a fixed anchor so a calendar grid's
 * Mon..Sun header can ask Intl for real short weekday names instead of a
 * hand-written table, in whichever locale is active.
 */
export function weekdayAbbrevsMondayFirst(locale: Locale): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return d.toLocaleDateString(INTL_LOCALE[locale], { weekday: "short", timeZone: "UTC" });
  });
}

export function monthFullNames(locale: Locale): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(2024, i, 1));
    return d.toLocaleDateString(INTL_LOCALE[locale], { month: "long", timeZone: "UTC" });
  });
}
