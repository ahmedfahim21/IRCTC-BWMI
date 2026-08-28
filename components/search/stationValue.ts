import type { StationResult } from "@/app/api/stations/route";
import { api } from "@/lib/apiClient";
import type { StationValue } from "./StationCombobox";

export function stationValueFromResult(result: StationResult): StationValue {
  return {
    token: result.token,
    label: result.name,
    sublabel:
      result.kind === "city"
        ? result.memberCodes.join(" · ")
        : `${result.code} · ${result.city}, ${result.stateCode}`,
  };
}

/** Resolve a search token (station code or city:Name) into a combobox value. */
export async function resolveStationToken(token: string): Promise<StationValue | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const query = trimmed.startsWith("city:") ? trimmed.slice(5) : trimmed;
  const { results } = await api.stations(query, 12);
  const match =
    results.find((r) => r.token === trimmed) ?? results.find((r) => r.code === trimmed);
  if (match) return stationValueFromResult(match);

  return {
    token: trimmed,
    label: trimmed.replace("city:", ""),
    sublabel: trimmed,
  };
}
