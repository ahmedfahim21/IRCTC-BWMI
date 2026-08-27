/** Wire shapes returned by the RailRadar API, as observed from live responses. */

export interface RrStationRef {
  code: string;
  name: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export interface RrTrainMeta {
  number: string;
  name: string;
  type: string;
  category?: string;
  source: RrStationRef;
  destination: RrStationRef;
  runDays: string[];
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  totalHalts: number;
  returnTrain?: string;
  coachPosition?: string;
}

export interface RrRouteStop {
  sequence: number;
  station: RrStationRef;
  isHalt: boolean;
  platform?: string;
  speedToNextStationKmph?: number;
  arrival?: string;
  arrivalDay?: number;
  departure?: string;
  departureDay?: number;
  distance: number;
}

export interface RrTrainResponse {
  train: RrTrainMeta;
  route: RrRouteStop[];
}

export interface RrLiveRouteStop {
  sequence: number;
  stationCode: string;
  stationName: string;
  isHalt: boolean;
  status: "departed" | "at-station" | "upcoming" | string;
  coachPosition?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  arrivalDay?: number;
  departureDay?: number;
  delayArrival?: number;
  delayDeparture?: number;
  platform?: string;
  distance: number;
  speedToNextStationKmph?: number;
}

export interface RrLiveResponse {
  trainNumber: string;
  trainName: string;
  startDate: string;
  lastUpdatedAt: string;
  status: "not-started" | "running" | "completed" | string;
  isLive: boolean;
  trackingMode?: string;
  train: RrTrainMeta;
  currentLocation?: {
    stationCode: string;
    sequence: number;
    status: string;
    isHalt: boolean;
    isActualPosition: boolean;
    distanceFromOriginKm: number;
    distanceFromLastStationKm: number;
    delayMinutes: number;
    stationName: string;
  };
  nextHalt?: { stationCode: string; stationName: string; sequence: number; distance: number };
  delayMinutes: number;
  route: RrLiveRouteStop[];
}

export interface RrCoach {
  position: number;
  code: string;
  classType: string;
  className: string;
  category: string;
  totalBerths: number;
  hasSeats: boolean;
}

export interface RrCoachesResponse {
  trainNumber: string;
  trainName: string;
  sourceStation: RrStationRef;
  destinationStation: RrStationRef;
  totalCoaches: number;
  coachPosition: string;
  rake: RrCoach[];
}

export interface RrBetweenTrain {
  train: { number: string; name: string; type: string; runDays: string[] };
  from: RrStationRef & { departure: string; day: number; sequence: number };
  to: RrStationRef & { arrival: string; day: number; sequence: number };
  distance: number;
  duration: number;
  totalHaltsBetween: number;
}

export interface RrBetweenResponse {
  from: RrStationRef;
  to: RrStationRef;
  trains: RrBetweenTrain[];
  count: number;
}

export interface RrSeatDay {
  date: string;
  rawDate: string;
  status: string;
  statusCode: "AVAILABLE" | "WAITLIST" | "RAC" | "REGRET" | "NOT_AVAILABLE" | string;
  isAvailable: boolean;
  availableSeats?: number;
  waitlistNumber?: number;
  waitlistType?: string;
}

export interface RrSeatsResponse {
  trainNumber: string;
  trainName: string;
  quotaCode: string;
  generatedAt: string;
  calendar: RrSeatDay[];
}

export interface RrStationSearchResult {
  code: string;
  name: string;
  city: string;
  popularity: number;
  isActive: boolean;
}
