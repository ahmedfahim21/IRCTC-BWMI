/**
 * Train-type index shared by the live-map wire format and the map UI.
 *
 * Colours are UX4G semantic tokens — the previous canvas palette was the only
 * place in the app that painted with raw hex, so it ignored the theme and
 * never went through the contrast audit.
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

/**
 * These category names arrive as English strings from the live-map API
 * (`data.types`), so they can't route through the flat STRINGS dictionary
 * the way static labels do. The set is fixed and small, so a lookup table
 * translates the ones the API can actually send; anything unrecognised
 * (a future category) passes through untranslated rather than disappearing.
 */
const TRAIN_TYPE_HI: Record<string, string> = {
  Rajdhani: "राजधानी",
  Shatabdi: "शताब्दी",
  "Vande Bharat": "वंदे भारत",
  Duronto: "दूरंतो",
  Superfast: "सुपरफास्ट",
  Express: "एक्सप्रेस",
  Passenger: "पैसेंजर",
  Special: "स्पेशल",
  Other: "अन्य",
};

export function localizeTrainType(label: string, locale: "en" | "hi"): string {
  if (locale !== "hi") return label;
  return TRAIN_TYPE_HI[label] ?? label;
}

/** CSS custom-property names (without `var()`) keyed by `TRAIN_TYPES` index. */
export const TYPE_COLOUR_VARS = [
  "--danger",
  "--warn",
  "--ok",
  "--info",
  "--brand",
  "--accent",
  "--text-faint",
  "--warn",
  "--text-dim",
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
