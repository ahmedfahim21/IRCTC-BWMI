import type { Availability, ClassCode, CoachLayout, CoachType, QuotaCode, Train } from "@/lib/types";
import { buildBerths } from "./berths";
import { classCapacity, getAvailability } from "./availability";

/**
 * The berth map for every coach of a class on one journey. Occupancy is derived
 * from the same availability figure the results page shows, so the diagram and
 * the "AVL 42" chip can never disagree with each other.
 */
export function coachLayouts(
  train: Train,
  classCode: ClassCode,
  dateIso: string,
  quota: QuotaCode,
  fromCode: string,
  toCode: string,
  today: string
): { layouts: CoachLayout[]; availability: Availability } {
  const availability = getAvailability({ train, dateIso, classCode, quota, fromCode, toCode, today });
  const capacity = classCapacity(train, classCode);
  const freeSeats = availability.state === "available" ? availability.count : 0;
  const occupancy = capacity === 0 ? 1 : Math.min(0.995, 1 - freeSeats / capacity);

  const layouts = train.rake
    .filter((coach) => coach.type === (classCode as string))
    .map((coach) => ({
      ...coach,
      berths: buildBerths(`${train.number}:${dateIso}:${coach.code}`, coach.type as CoachType, occupancy),
    }));

  return { layouts, availability };
}

export function freeBerths(layouts: CoachLayout[]) {
  return layouts.flatMap((coach) =>
    coach.berths.filter((b) => !b.isBooked).map((berth) => ({ coachCode: coach.code, berth }))
  );
}
