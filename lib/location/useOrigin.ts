"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NearestResponse, NearestStation } from "@/app/api/stations/nearest/route";

export type OriginSource = "recent" | "coords" | "network" | "none";

export interface SuggestedOrigin {
  station: NearestStation | null;
  source: OriginSource;
  /** True while precise location is being requested from the browser. */
  locating: boolean;
  /** Set when the user declined, or the device could not produce a fix. */
  error: string | null;
  /** Asks the browser for a precise fix. Prompts the user; never called on load. */
  useMyLocation: () => void;
}

const LAST_SEARCH_KEY = "irctc.lastSearch";

function lastSearchedOrigin(): NearestStation | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_SEARCH_KEY) ?? "null");
    if (!saved?.from?.token || saved.from.token.startsWith("city:")) return null;
    return { code: saved.from.token, name: saved.from.label, city: saved.from.label, distanceKm: 0 };
  } catch {
    return null;
  }
}

/**
 * Where to start the journey from, without assuming New Delhi.
 *
 * In order of confidence:
 *   1. the station you last searched from — you told us, so we believe you
 *   2. a precise fix from the Geolocation API, only ever after you ask for it
 *   3. the coarse city the host derives from your IP, which needs no permission
 *      and never leaves the server
 *
 * If none of those land we return nothing and let the interface ask, rather
 * than quietly picking a city for you.
 */
export function useOrigin(): SuggestedOrigin {
  const [recent, setRecent] = useState<NearestStation | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setRecent(lastSearchedOrigin()), []);

  const { data } = useQuery({
    queryKey: ["nearestStation", coords?.lat ?? null, coords?.lng ?? null],
    queryFn: async ({ signal }) => {
      const query = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
      const response = await fetch(`/api/stations/nearest${query}`, { signal });
      if (!response.ok) throw new Error("Could not work out where you are");
      return (await response.json()) as NearestResponse;
    },
    staleTime: 30 * 60_000,
  });

  const useMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("This browser can't share a location.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      (cause) => {
        setLocating(false);
        setError(
          cause.code === cause.PERMISSION_DENIED
            ? "Location access was blocked. Type a station instead."
            : "Couldn't get a location fix. Type a station instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 }
    );
  }, []);

  // A precise fix beats a remembered one; a remembered one beats a guess from IP.
  const station = coords ? (data?.origin ?? null) : (recent ?? data?.origin ?? null);
  const source: OriginSource = coords && data?.origin ? "coords" : recent ? "recent" : data?.origin ? "network" : "none";

  return { station, source, locating, error, useMyLocation };
}
