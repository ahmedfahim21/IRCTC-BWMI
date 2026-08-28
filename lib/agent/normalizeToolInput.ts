export type BookingOptionsPatch = {
  addMeals?: boolean;
  travelInsurance?: boolean;
  keepTogether?: boolean;
  autoUpgrade?: boolean;
};

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return undefined;
}

/** Coerce model tool args into the booking option keys BookingFlow expects. */
export function normalizeSetOptionsInput(input: Record<string, unknown>): BookingOptionsPatch {
  const patch: BookingOptionsPatch = {};

  for (const key of ["addMeals", "travelInsurance", "keepTogether", "autoUpgrade"] as const) {
    const value = asBool(input[key]);
    if (value !== undefined) patch[key] = value;
  }

  if (asBool(input.removeMeals) || asBool(input.noMeals)) patch.addMeals = false;
  if (asBool(input.withMeals) || asBool(input.includeMeals)) patch.addMeals = true;

  if (asBool(input.removeTravelInsurance) || asBool(input.removeInsurance) || asBool(input.noInsurance)) {
    patch.travelInsurance = false;
  }
  if (asBool(input.withInsurance) || asBool(input.includeInsurance)) patch.travelInsurance = true;

  if (asBool(input.removeKeepTogether)) patch.keepTogether = false;
  if (asBool(input.removeAutoUpgrade)) patch.autoUpgrade = false;

  return patch;
}

export function applyBookingOptionsPatch(
  current: Required<BookingOptionsPatch>,
  patch: BookingOptionsPatch
): { next: Required<BookingOptionsPatch>; changed: string[] } {
  const next = { ...current };
  const labels: Record<keyof BookingOptionsPatch, string> = {
    addMeals: "meals",
    travelInsurance: "insurance",
    keepTogether: "keep-together",
    autoUpgrade: "auto-upgrade",
  };
  const changed: string[] = [];

  for (const key of Object.keys(labels) as Array<keyof BookingOptionsPatch>) {
    const value = patch[key];
    if (value === undefined) continue;
    next[key] = value;
    changed.push(labels[key]);
  }

  return { next, changed };
}
