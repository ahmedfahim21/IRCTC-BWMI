/**
 * Train-type index shared by the live-map wire format and the map UI.
 *
 * Colours resolve from CSS custom properties so the map canvas picks up theme
 * changes without hard-coded hex.
 */

export const TRAIN_TYPES = [
  "Rajdhani",
  "Shatabdi",
  "Vande Bharat",
  "Duronto",
  "Superfast",
  "Express",
  "Passenger",
  "Special",
  "Other",
] as const;

/** CSS custom-property names (without `var()`) keyed by `TRAIN_TYPES` index. */
export const TYPE_COLOUR_VARS = [
  "--destructive",
  "--warning",
  "--success",
  "--info",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--muted-foreground",
] as const;

export function typeColourVar(index: number): string {
  return `var(${TYPE_COLOUR_VARS[index] ?? TYPE_COLOUR_VARS[8]})`;
}

/** Resolve token colours to paint values the map canvas can consume. */
export function resolveTypeColours(root: HTMLElement = document.documentElement): string[] {
  const style = getComputedStyle(root);
  return TYPE_COLOUR_VARS.map((name) => style.getPropertyValue(name).trim() || "#888888");
}

export function resolveToken(name: string, root: HTMLElement = document.documentElement): string {
  return getComputedStyle(root).getPropertyValue(name).trim();
}
