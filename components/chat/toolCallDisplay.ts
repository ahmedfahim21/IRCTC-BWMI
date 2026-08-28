export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type ToolStatus = "calling" | "done" | "failed";

export function toolStatus({ state, output }: { state: string; output: unknown }): ToolStatus {
  if (state === "output-error") return "failed";
  if (isRecord(output) && output.ok === false) return "failed";
  if (state === "output-available") return "done";
  return "calling";
}

export function statusLabel(status: ToolStatus): string {
  switch (status) {
    case "calling":
      return "Calling";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function toolResultText(output: unknown): string | null {
  if (!isRecord(output)) return null;
  if (typeof output.error === "string") return output.error;
  if (typeof output.detail === "string") return output.detail;
  if (typeof output.text === "string") return output.text;
  if (typeof output.action === "string") return `Done: ${output.action}`;
  return null;
}

export type StationMatch = { code: string; name: string };

export function stationMatches(output: unknown): StationMatch[] {
  if (!isRecord(output)) return [];
  if (Array.isArray(output.data)) {
    const rows: StationMatch[] = [];
    for (const item of output.data) {
      if (!isRecord(item)) continue;
      if (typeof item.code === "string" && typeof item.name === "string") {
        rows.push({ code: item.code, name: item.name });
      }
    }
    if (rows.length > 0) return rows;
  }
  if (typeof output.text !== "string") return [];
  const rows: StationMatch[] = [];
  for (const line of output.text.split("\n")) {
    const match = /^([A-Z]{2,5})\s+[—–-]\s+(.+)$/.exec(line.trim());
    if (match) rows.push({ code: match[1], name: match[2] });
  }
  return rows;
}

function primitiveLabel(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "on" : "off";
  return null;
}

const HEADER_KEYS = ["query", "href", "number", "classCode", "pnr", "trainNumber", "coach"] as const;

export function headerSummary(input: Record<string, unknown> | null): string {
  if (!input) return "";
  const from = primitiveLabel(input.from);
  const to = primitiveLabel(input.to);
  if (from && to) return `${from} → ${to}`;
  for (const key of HEADER_KEYS) {
    const label = primitiveLabel(input[key]);
    if (!label) continue;
    if (key === "coach" && input.berth !== undefined) return `${label} · ${String(input.berth)}`;
    return label;
  }
  if (Array.isArray(input.passengers)) return `${input.passengers.length} passengers`;
  const bits: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    const label = primitiveLabel(value);
    if (!label) continue;
    bits.push(typeof value === "boolean" ? `${key.replaceAll("_", " ")} ${label}` : label);
    if (bits.length >= 3) break;
  }
  return bits.join(" · ");
}

export function inputRows(input: Record<string, unknown> | null): Array<{ key: string; value: string }> {
  if (!input) return [];
  return Object.entries(input).map(([key, value]) => ({
    key: key.replaceAll("_", " "),
    value:
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value),
  }));
}
