import type {
  Availability,
  Booking,
  BookingDraft,
  ClassCode,
  Coach,
  CoachLayout,
  Crossing,
  LiveStatus,
  PunctualityDay,
  QuotaCode,
  RefundQuote,
  ScheduleStop,
  Station,
  Train,
  TrainType,
} from "@/lib/types";
import type { JourneyDto } from "@/lib/api/dto";
import type { AlternativeGroup } from "@/lib/domain/alternatives";
import type { StationResult } from "@/app/api/stations/route";
import type { PlatformPosition } from "@/lib/domain/platform";
import type { RouteDay } from "@/app/api/route-availability/route";

/**
 * The UI talks to the app's own HTTP API and never reaches into the mock data
 * directly. That keeps the route handlers the thing under test, and means
 * swapping in a real CRIS backend is a change behind this boundary alone.
 */
/**
 * Fires when the service worker served a cached response because the network
 * was unreachable. More trustworthy than navigator.onLine, which also reports
 * "online" behind captive portals and on a train with no actual connectivity.
 */
export const STALE_EVENT = "irctc:stale";

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, headers: { accept: "application/json" } });
  if (typeof window !== "undefined" && response.headers.get("x-irctc-offline")) {
    window.dispatchEvent(new CustomEvent(STALE_EVENT));
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(body.error ?? `Request failed: ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

async function send<T>(path: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(payload.error ?? `Request failed: ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface SearchResponse {
  query: { from: string; to: string; date: string; quota: QuotaCode; today: string; fromCodes: string[]; toCodes: string[] };
  journeys: JourneyDto[];
  anyConfirmable: boolean;
  alternatives: AlternativeGroup[];
  /** True when the network answered but runs nothing direct on this pair. */
  noDirectTrain?: boolean;
  source?: "live" | "generated";
  availabilitySource?: "live" | "generated";
  stations: Record<string, Station>;
}

export interface TrainResponse {
  train: Pick<
    Train,
    | "number" | "name" | "type" | "runsOn" | "classes" | "hasPantry" | "returnTrainNumber"
    | "departureMinute" | "distanceKm" | "durationMins" | "haltCount" | "avgSpeedKmph"
    | "maxSpeedKmph" | "avgDelayMins" | "schedule" | "rake"
  >;
  date: string;
  crossings: Crossing[];
  crossingsAvailable?: boolean;
  punctuality: PunctualityDay[];
  punctualityAvailable?: boolean;
  source?: "live" | "generated";
  stations: Record<string, Station>;
}

export interface LiveResponse {
  live: LiveStatus;
  timeline: Array<{ stationCode: string; delayMins: number; actualArrival: number | null; actualDeparture: number | null }>;
}

export interface DateStripResponse {
  trainNumber: string;
  classCode: ClassCode;
  quota: QuotaCode;
  days: Availability[];
}

export interface CoachesResponse {
  trainNumber: string;
  classCode: ClassCode;
  date: string;
  availability: Availability;
  coaches: CoachLayout[];
  platform: number | null;
  positions: PlatformPosition[];
  boardingStation: Station;
}

export interface DraftResponse {
  draft: BookingDraft;
  train: { number: string; name: string; type: TrainType; classes: ClassCode[]; hasPantry: boolean; schedule: ScheduleStop[] };
  stations: Record<string, Station>;
}

export interface BookingsResponse {
  bookings: Booking[];
  trains: Record<string, { number: string; name: string; type: TrainType; avgDelayMins: number }>;
  stations: Record<string, Station>;
}

export interface TripResponse {
  booking: Booking;
  train: { number: string; name: string; type: TrainType; distanceKm: number; avgDelayMins: number; schedule: ScheduleStop[]; rake: Coach[] };
  live: LiveStatus;
  boardingStop: ScheduleStop;
  alightingStop: ScheduleStop;
  boardingDelayMins: number;
  arrivalDelayMins: number;
  coachPosition: PlatformPosition | null;
  stations: Record<string, Station>;
}

const qs = (params: Record<string, string | number | undefined | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

export interface RouteAvailabilityResponse {
  from: string;
  to: string;
  quota: QuotaCode;
  days: RouteDay[];
}

export interface StatusResponse {
  live: boolean;
  voice: boolean;
  quota: { month: string; used: number; budget: number; remaining: number } | null;
  sources: Record<string, string>;
}

export const api = {
  status: (signal?: AbortSignal) => get<StatusResponse>("/api/status", signal),

  routeAvailability: (
    p: { from: string; to: string; date: string; quota?: QuotaCode; classes?: string; span?: number },
    signal?: AbortSignal
  ) => get<RouteAvailabilityResponse>(`/api/route-availability?${qs(p)}`, signal),

  stations: (q: string, limit = 12, signal?: AbortSignal) =>
    get<{ results: StationResult[] }>(`/api/stations?${qs({ q, limit })}`, signal),

  search: (p: { from: string; to: string; date: string; quota?: QuotaCode; classes?: string }, signal?: AbortSignal) =>
    get<SearchResponse>(`/api/search?${qs(p)}`, signal),

  train: (number: string, date?: string, signal?: AbortSignal) =>
    get<TrainResponse>(`/api/trains/${number}?${qs({ date })}`, signal),

  live: (number: string, date: string, signal?: AbortSignal) =>
    get<LiveResponse>(`/api/trains/${number}/live?${qs({ date })}`, signal),

  dateStrip: (
    number: string,
    p: { from: string; to: string; date: string; class?: string; quota?: QuotaCode; span?: number },
    signal?: AbortSignal
  ) => get<DateStripResponse>(`/api/trains/${number}/availability?${qs(p)}`, signal),

  coaches: (
    number: string,
    classCode: string,
    p: { from: string; to: string; date: string; quota?: QuotaCode },
    signal?: AbortSignal
  ) => get<CoachesResponse>(`/api/trains/${number}/coaches/${classCode}?${qs(p)}`, signal),

  createDraft: (body: {
    trainNumber: string;
    journeyDate: string;
    fromCode: string;
    toCode: string;
    classCode: ClassCode;
    quota?: QuotaCode;
    tatkalOpensAt?: string | null;
  }) => send<{ draft: BookingDraft }>("/api/bookings/draft", "POST", body),

  draft: (draftId: string, signal?: AbortSignal) => get<DraftResponse>(`/api/bookings/draft/${draftId}`, signal),

  patchDraft: (draftId: string, patch: Partial<BookingDraft>) =>
    send<{ draft: BookingDraft }>(`/api/bookings/draft/${draftId}`, "PATCH", patch),

  confirmDraft: (draftId: string) =>
    send<{ booking: Booking }>(`/api/bookings/draft/${draftId}/confirm`, "POST"),

  bookings: (signal?: AbortSignal) => get<BookingsResponse>("/api/bookings", signal),

  trip: (pnr: string, signal?: AbortSignal) => get<TripResponse>(`/api/pnr/${pnr}`, signal),

  refundPreview: (
    p: { train: string; from: string; date: string; class: string; total: number; passengers: number; confirmed?: string },
    signal?: AbortSignal
  ) => get<{ quote: RefundQuote }>(`/api/refund-preview?${qs(p)}`, signal),

  refundQuote: (pnr: string, signal?: AbortSignal) =>
    get<{ pnr: string; quote: RefundQuote }>(`/api/bookings/${pnr}/refund-quote`, signal),

  cancel: (pnr: string) => send<{ booking: Booking; quote: RefundQuote }>(`/api/bookings/${pnr}/cancel`, "POST"),
};
