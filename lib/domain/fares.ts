import type { ClassCode, FareBreakdown, QuotaCode, TrainType } from "@/lib/types";

/** Rupees per km, by class. */
const RATE_PER_KM: Record<ClassCode, number> = {
  "1A": 4.2,
  EC: 3.0,
  "2A": 2.45,
  "3A": 1.75,
  "3E": 1.55,
  CC: 1.5,
  SL: 0.65,
  "2S": 0.35,
};

const MINIMUM_FARE: Record<ClassCode, number> = {
  "1A": 620,
  EC: 480,
  "2A": 380,
  "3A": 260,
  "3E": 240,
  CC: 210,
  SL: 130,
  "2S": 60,
};

const RESERVATION_CHARGE: Record<ClassCode, number> = {
  "1A": 60,
  EC: 60,
  "2A": 50,
  CC: 40,
  "3A": 40,
  "3E": 40,
  SL: 20,
  "2S": 15,
};

const SUPERFAST_CHARGE: Record<ClassCode, number> = {
  "1A": 75,
  EC: 75,
  "2A": 45,
  CC: 45,
  "3A": 45,
  "3E": 45,
  SL: 30,
  "2S": 15,
};

export const AC_CLASSES: ClassCode[] = ["1A", "2A", "3A", "3E", "CC", "EC"];

const SUPERFAST_TYPES: TrainType[] = ["rajdhani", "duronto", "shatabdi", "vandeBharat", "superfast"];
const CATERED_TYPES: TrainType[] = ["rajdhani", "duronto", "shatabdi", "vandeBharat"];

const CATERING_CHARGE: Partial<Record<ClassCode, number>> = {
  "1A": 440,
  EC: 380,
  "2A": 350,
  "3A": 305,
  CC: 260,
  "2S": 160,
};

export interface FareInput {
  classCode: ClassCode;
  quota: QuotaCode;
  trainType: TrainType;
  distanceKm: number;
  /** Drives dynamic pricing on premium trains. 0..1, where 1 = nearly full. */
  occupancy: number;
  includeCatering: boolean;
}

/** Round to the ₹5 that Indian Railways actually prints on a ticket. */
const roundFare = (n: number) => Math.round(n / 5) * 5;

export function computeFare(input: FareInput): FareBreakdown {
  const { classCode, quota, trainType, distanceKm, occupancy, includeCatering } = input;

  const baseFare = roundFare(
    Math.max(MINIMUM_FARE[classCode], distanceKm * RATE_PER_KM[classCode])
  );
  const reservationCharge = RESERVATION_CHARGE[classCode];
  const superfastCharge = SUPERFAST_TYPES.includes(trainType) ? SUPERFAST_CHARGE[classCode] : 0;

  // Flexi-fare on premium trains, and the Tatkal premium on top of that.
  let surgeMultiplier = 0;
  if (trainType === "rajdhani" || trainType === "duronto" || trainType === "shatabdi") {
    surgeMultiplier += Math.min(0.5, Math.max(0, occupancy - 0.5)) * 0.9;
  }
  if (quota === "TQ") surgeMultiplier += classCode === "SL" ? 0.1 : 0.3;
  if (quota === "PT") surgeMultiplier += classCode === "SL" ? 0.25 : 0.5;
  const dynamicSurge = roundFare(baseFare * surgeMultiplier);

  const cateringCharge =
    includeCatering && CATERED_TYPES.includes(trainType) ? CATERING_CHARGE[classCode] ?? 0 : 0;

  const taxable = baseFare + reservationCharge + superfastCharge + dynamicSurge + cateringCharge;
  const gst = AC_CLASSES.includes(classCode) ? Math.round(taxable * 0.05) : 0;
  const convenienceFee = AC_CLASSES.includes(classCode) ? 20 : 15;

  return {
    baseFare,
    reservationCharge,
    superfastCharge,
    dynamicSurge,
    cateringCharge,
    gst,
    convenienceFee,
    total: taxable + gst + convenienceFee,
  };
}

/** Per-passenger fares combined into one ticket. Convenience fee is charged once. */
export function sumFares(fares: FareBreakdown[]): FareBreakdown {
  if (fares.length === 0) {
    throw new Error("sumFares needs at least one passenger fare");
  }
  const convenienceFee = fares[0].convenienceFee;
  const total = fares.reduce(
    (acc, f) => ({
      baseFare: acc.baseFare + f.baseFare,
      reservationCharge: acc.reservationCharge + f.reservationCharge,
      superfastCharge: acc.superfastCharge + f.superfastCharge,
      dynamicSurge: acc.dynamicSurge + f.dynamicSurge,
      cateringCharge: acc.cateringCharge + f.cateringCharge,
      gst: acc.gst + f.gst,
    }),
    { baseFare: 0, reservationCharge: 0, superfastCharge: 0, dynamicSurge: 0, cateringCharge: 0, gst: 0 }
  );
  return {
    ...total,
    convenienceFee,
    total:
      total.baseFare +
      total.reservationCharge +
      total.superfastCharge +
      total.dynamicSurge +
      total.cateringCharge +
      total.gst +
      convenienceFee,
  };
}
