import { describe, expect, it } from "vitest";
import {
  headerSummary,
  stationMatches,
  statusLabel,
  toolResultText,
  toolStatus,
} from "@/components/chat/toolCallDisplay";

describe("tool call display", () => {
  it("treats ok:false as failed even when the part is output-available", () => {
    expect(toolStatus({ state: "output-available", output: { ok: false, error: "not open" } })).toBe("failed");
  });

  it("labels each status", () => {
    expect(statusLabel("calling")).toBe("Calling");
    expect(statusLabel("done")).toBe("Done");
    expect(statusLabel("failed")).toBe("Failed");
  });

  it("summarises a route in the header", () => {
    expect(headerSummary({ from: "NDLS", to: "MAS", date: "2026-09-01" })).toBe("NDLS → MAS");
  });

  it("summarises a station query", () => {
    expect(headerSummary({ query: "Mangalore" })).toBe("Mangalore");
  });

  it("parses station rows from tool data", () => {
    expect(
      stationMatches({
        text: "MAJN — Mangalore Junction\nMAQ — Mangalore Central",
        data: [
          { code: "MAJN", name: "Mangalore Junction" },
          { code: "MAQ", name: "Mangalore Central" },
        ],
      })
    ).toEqual([
      { code: "MAJN", name: "Mangalore Junction" },
      { code: "MAQ", name: "Mangalore Central" },
    ]);
  });

  it("reads error text from a failed UI action", () => {
    expect(toolResultText({ ok: false, error: "booking screen is not open" })).toBe("booking screen is not open");
  });
});
