import { describe, expect, it } from "vitest";
import { planFromTranscript } from "@/lib/agent/scriptedChat";

function sessionAfter(text: string) {
  const plan = planFromTranscript(text);
  const search = plan.find((step) => step.kind === "tool" && step.name === "set_search");
  if (search?.kind === "tool") {
    return {
      from: String(search.args.from),
      to: String(search.args.to),
      date: String(search.args.date),
      quota: String(search.args.quota ?? "GN"),
    };
  }
  return { from: "NDLS", to: "BCT", date: "2026-09-12", quota: "GN" };
}

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

  it("changes destination mid-conversation without a new from-to pair", () => {
    const session = sessionAfter("from New Delhi to Mumbai tomorrow");
    const steps = planFromTranscript("change destination to Chennai", session);
    const search = steps.find((s) => s.kind === "tool" && s.name === "set_search");
    expect(search).toMatchObject({ kind: "tool", name: "set_search", args: { from: "NDLS", to: "MAS" } });
  });

  it("changes origin mid-conversation", () => {
    const session = sessionAfter("from New Delhi to Mumbai tomorrow");
    const steps = planFromTranscript("change origin to NZM", session);
    const search = steps.find((s) => s.kind === "tool" && s.name === "set_search");
    expect(search).toMatchObject({ kind: "tool", name: "set_search", args: { from: "NZM", to: "BCT" } });
  });

  it("replaces the whole journey when a new pair is given", () => {
    sessionAfter("from New Delhi to Mumbai tomorrow");
    const steps = planFromTranscript("from Bangalore to Chennai tomorrow");
    const search = steps.find((s) => s.kind === "tool" && s.name === "set_search");
    expect(search).toMatchObject({ kind: "tool", name: "set_search", args: { from: "SBC", to: "MAS" } });
  });

  it("toggles meals on the booking screen", () => {
    const steps = planFromTranscript("add meals please");
    expect(steps.some((s) => s.kind === "tool" && s.name === "set_options" && s.args.addMeals === true)).toBe(true);
  });

  it("picks a berth when asked for seats", () => {
    const steps = planFromTranscript("show me the seat layout");
    expect(steps.some((s) => s.kind === "tool" && s.name === "select_berth")).toBe(true);
  });

  it("asks a question when the turn is not a journey", () => {
    const steps = planFromTranscript("hello");
    expect(steps[0]).toMatchObject({ kind: "text" });
    expect(steps[0].kind === "text" && /which stations/i.test(steps[0].text)).toBe(true);
  });

  it("changes the date of the current search", () => {
    const session = sessionAfter("from New Delhi to Mumbai");
    const steps = planFromTranscript("change the date to tomorrow", session);
    const search = steps.find((s) => s.kind === "tool" && s.name === "set_search");
    expect(search?.kind === "tool" && String(search.args.date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(search?.kind === "tool" && search.args.from).toBe("NDLS");
    expect(search?.kind === "tool" && search.args.to).toBe("BCT");
  });
});
