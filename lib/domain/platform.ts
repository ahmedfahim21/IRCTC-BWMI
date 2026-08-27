import type { Coach, Station, Train } from "@/lib/types";
import { rngFor } from "@/lib/mock/rng";

/** LHB coaches are about 24 m over buffers. */
const COACH_LENGTH_M = 24;

export interface PlatformPosition {
  coach: Coach;
  platform: number | null;
  platformLengthM: number;
  /** Metres from the foot-over-bridge / main entrance along the platform. */
  distanceFromEntryM: number;
  direction: "towardsFront" | "towardsRear" | "atEntry";
  zone: "frontEnd" | "middle" | "rearEnd";
  /** Plain-language instruction — the thing people actually want. */
  hint: string;
}

function platformLength(station: Station): number {
  return station.platformCount >= 8 ? 620 : station.platformCount >= 5 ? 540 : station.platformCount >= 3 ? 440 : 320;
}

/**
 * Where a coach comes to rest on the platform, and how far that is from the
 * foot-over-bridge. This is the single reason people keep a third-party app
 * open on the platform — so it belongs in the ticket, not in another app.
 */
export function coachPositions(train: Train, station: Station, platform: number | null): PlatformPosition[] {
  const rng = rngFor(`platform:${train.number}:${station.code}`);
  const lengthM = platformLength(station);
  // Which end the loco stops at, and where the overbridge lands — stable per station.
  const locoAtFront = rng.bool(0.5);
  const entryM = lengthM * (0.3 + rng.next() * 0.4);

  const haulage = train.rake.filter((c) => c.type !== "ENG");
  const trainLengthM = haulage.length * COACH_LENGTH_M;
  // Trains are berthed roughly centred, clipped to the platform.
  const startM = Math.max(0, (lengthM - trainLengthM) / 2);

  return train.rake.map((coach) => {
    const index = haulage.findIndex((c) => c.code === coach.code);
    const ordinal = index < 0 ? 0 : locoAtFront ? index : haulage.length - 1 - index;
    const centreM = startM + ordinal * COACH_LENGTH_M + COACH_LENGTH_M / 2;
    const offset = centreM - entryM;
    const distanceFromEntryM = Math.round(Math.abs(offset));

    const direction: PlatformPosition["direction"] =
      distanceFromEntryM < 15 ? "atEntry" : offset < 0 ? "towardsRear" : "towardsFront";
    const fraction = centreM / lengthM;
    const zone: PlatformPosition["zone"] = fraction < 0.33 ? "rearEnd" : fraction > 0.66 ? "frontEnd" : "middle";

    const where =
      direction === "atEntry"
        ? "right at the foot-over-bridge"
        : `about ${distanceFromEntryM} m ${direction === "towardsFront" ? "ahead of" : "behind"} the foot-over-bridge`;

    return {
      coach,
      platform,
      platformLengthM: lengthM,
      distanceFromEntryM,
      direction,
      zone,
      hint:
        coach.type === "ENG"
          ? `Engine stops at the ${locoAtFront ? "far" : "near"} end`
          : `Coach ${coach.code} stops ${where}`,
    };
  });
}

/** Just the one coach, for the trip screen. */
export function positionOfCoach(train: Train, station: Station, platform: number | null, coachCode: string) {
  return coachPositions(train, station, platform).find((p) => p.coach.code === coachCode) ?? null;
}
