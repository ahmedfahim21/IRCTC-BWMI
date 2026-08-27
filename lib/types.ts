/** Shared domain types. camelCase throughout — no serialization layer. */

export type ClassCode = "1A" | "2A" | "3A" | "3E" | "SL" | "CC" | "EC" | "2S";
export type QuotaCode = "GN" | "TQ" | "PT" | "LD" | "SS" | "DF";

export type AvailabilityState =
  | "available"
  | "rac"
  | "waitlist"
  | "regretted"
  | "notAvailable"
  | "departed";

export type BerthType = "LB" | "MB" | "UB" | "SL" | "SU" | "WS" | "AS" | "CB";

export type CoachType =
  | "ENG"
  | "SLR"
  | "GS"
  | "PC"
  | "1A"
  | "2A"
  | "3A"
  | "3E"
  | "SL"
  | "CC"
  | "EC"
  | "2S";

export interface Station {
  code: string;
  name: string;
  city: string;
  stateCode: string;
  lat: number;
  lng: number;
  zone: string;
  platformCount: number;
}

/** A station's position along a corridor. */
export interface CorridorStop {
  stationCode: string;
  distanceKm: number;
}

export interface Corridor {
  id: string;
  name: string;
  stops: CorridorStop[];
}

export type TrainType =
  | "rajdhani"
  | "shatabdi"
  | "vandeBharat"
  | "duronto"
  | "superfast"
  | "express"
  | "passenger";

export interface ScheduleStop {
  stationCode: string;
  /** Minutes from midnight on day 1 of the journey. null at the origin / destination. */
  arrivalMinute: number | null;
  departureMinute: number | null;
  /** 0-based day offset from the journey start date. */
  dayOffset: number;
  distanceKm: number;
  /** true when the train passes without a commercial halt. */
  isHalt: boolean;
  haltMins: number;
  platform: number | null;
}

export interface Train {
  number: string;
  name: string;
  type: TrainType;
  corridorId: string;
  direction: "up" | "down";
  /** 0 = Sunday .. 6 = Saturday */
  runsOn: number[];
  classes: ClassCode[];
  hasPantry: boolean;
  returnTrainNumber: string;
  /** Minutes past midnight on day 1 — the origin departure. */
  departureMinute: number;
  schedule: ScheduleStop[];
  rake: Coach[];
  avgDelayMins: number;
  distanceKm: number;
  durationMins: number;
  haltCount: number;
  avgSpeedKmph: number;
  maxSpeedKmph: number;
}

export interface Berth {
  number: number;
  type: BerthType;
  bay: number;
  isBooked: boolean;
  nearToilet: boolean;
  nearDoor: boolean;
  hasCharging: boolean;
}

export interface Coach {
  code: string;
  type: CoachType;
  /** 1-based position from the loco. */
  position: number;
  berthCount: number;
}

export interface CoachLayout extends Coach {
  berths: Berth[];
}

export interface FareBreakdown {
  baseFare: number;
  reservationCharge: number;
  superfastCharge: number;
  dynamicSurge: number;
  cateringCharge: number;
  gst: number;
  convenienceFee: number;
  total: number;
}

export interface Availability {
  trainNumber: string;
  date: string;
  classCode: ClassCode;
  quota: QuotaCode;
  state: AvailabilityState;
  /** Seats free, RAC position, or WL position depending on `state`. */
  count: number;
  /** Raw IR-style label, e.g. "AVL 42", "RAC 12", "GNWL 38". */
  label: string;
  fare: FareBreakdown;
  confirmProbability: number | null;
  sampleSize: number;
}

export interface PunctualityDay {
  date: string;
  delayMins: number;
  cancelled: boolean;
}

export interface Crossing {
  stationCode: string;
  atMinute: number;
  trainNumber: string;
  trainName: string;
  kind: "crosses" | "overtakes" | "overtakenBy";
}

export interface LiveStatus {
  trainNumber: string;
  date: string;
  state: "notStarted" | "running" | "halted" | "arrived";
  lastStationCode: string | null;
  nextStopCode: string | null;
  delayMins: number;
  position: { lat: number; lng: number };
  speedKmph: number;
  distanceCoveredKm: number;
  /** Minutes from now until arrival at each station code. */
  etaByStation: Record<string, { etaMinute: number; delayMins: number }>;
  updatedAt: string;
  haltedSinceMinute: number | null;
}

export interface Passenger {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  berthPreference: BerthType | null;
  /** Assigned at confirmation, or chosen explicitly in the berth map. */
  allocatedCoach: string | null;
  allocatedBerth: number | null;
  allocatedBerthType: BerthType | null;
  status: "confirmed" | "rac" | "waitlist" | "cancelled";
  statusLabel: string;
}

export interface BookingDraft {
  draftId: string;
  trainNumber: string;
  journeyDate: string;
  fromCode: string;
  toCode: string;
  classCode: ClassCode;
  quota: QuotaCode;
  passengers: Passenger[];
  contactPhone: string | null;
  contactEmail: string | null;
  keepTogether: boolean;
  addMeals: boolean;
  travelInsurance: boolean;
  autoUpgrade: boolean;
  createdAt: string;
  holdExpiresAt: string;
  /** Set when saved as a Tatkal Ready draft. */
  tatkalOpensAt: string | null;
}

export type ChartStatus = "notPrepared" | "prepared";

export interface Booking {
  pnr: string;
  trainNumber: string;
  trainName: string;
  journeyDate: string;
  fromCode: string;
  toCode: string;
  classCode: ClassCode;
  quota: QuotaCode;
  passengers: Passenger[];
  fareBreakdown: FareBreakdown;
  status: "confirmed" | "partiallyConfirmed" | "waitlist" | "cancelled";
  chartStatus: ChartStatus;
  bookedAt: string;
  boardingMinute: number;
  alightingMinute: number;
  cancelledAt: string | null;
  refundAmount: number | null;
}

export interface RefundQuote {
  bookingTotal: number;
  cancellationCharge: number;
  gstOnCharge: number;
  refundAmount: number;
  slab: string;
  hoursBeforeDeparture: number;
  /** Upcoming boundaries where the refund drops. */
  nextSlabAt: string | null;
  nextSlabRefund: number | null;
}
