import { describe, expect, it } from "vitest";
import { planFromTranscript } from "@/lib/agent/scriptedChat";

describe("scripted chat", () => {
  it("asks which Delhi station when the city is ambiguous", () => {
    const steps = planFromTranscript("I want to travel from Delhi to Mumbai");
    expect(steps.some((s) => s.kind === "text" && /more than one station/i.test(s.text))).toBe(true);
    expect(steps.some((s) => s.kind === "tool" && s.name === "set_search")).toBe(false);
  });

  it("opens a search for a resolved pair", () => {
    const steps = planFromTranscript("from New Delhi to Mumbai tomorrow");
    expect(steps.some((s) => s.kind === "tool" && s.name === "search_trains")).toBe(true);
    expect(steps.some((s) => s.kind === "tool" && s.name === "set_search")).toBe(true);
  });

  it("holds a booking then the UI can confirm", () => {
    const steps = planFromTranscript("book 12951 in 3A");
    expect(steps.some((s) => s.kind === "tool" && s.name === "start_booking")).toBe(true);
  });

  it("suggests alternatives when there is no direct train", () => {
    const steps = planFromTranscript("no direct train from NDLS");
    expect(steps.some((s) => s.kind === "tool" && s.name === "suggest_alternatives")).toBe(true);
  });

  it("treats an expired hold as an error path", () => {
    const steps = planFromTranscript("the hold expired");
    expect(steps.some((s) => s.kind === "tool" && s.name === "confirm_booking")).toBe(true);
  });

  it("starts over on a change of mind", () => {
    const steps = planFromTranscript("change of mind, start over");
    expect(steps.some((s) => s.kind === "tool" && s.name === "navigate")).toBe(true);
  });
});
