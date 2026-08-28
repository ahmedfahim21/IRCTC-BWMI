import { describe, expect, it, beforeEach } from "vitest";
import { planFromTranscript, useFakeChat, resetScriptedSession } from "@/lib/agent/scriptedChat";

describe("scripted chat planner", () => {
  beforeEach(() => resetScriptedSession());

  it("uses the scripted path when the Anthropic key is absent", () => {
    expect(useFakeChat()).toBe(true);
  });
  it("resolves New Delhi to NDLS for search", () => {
    const plan = planFromTranscript("from New Delhi to Mumbai tomorrow");
    const search = plan.find((s) => s.kind === "tool" && s.name === "set_search");
    expect(search).toMatchObject({ kind: "tool", name: "set_search", args: { from: "NDLS", to: "BCT" } });
    expect(plan.some((s) => s.kind === "text" && /Searching NDLS/i.test(s.text))).toBe(true);
  });

  it("searches a station pair and drives set_search", () => {
    const plan = planFromTranscript("trains from NDLS to MAS");
    expect(plan.some((s) => s.kind === "tool" && s.name === "search_trains")).toBe(true);
    expect(plan.some((s) => s.kind === "tool" && s.name === "set_search")).toBe(true);
  });

  it("opens a PNR", () => {
    const plan = planFromTranscript("pnr 1234567890");
    expect(plan.some((s) => s.kind === "tool" && s.name === "get_pnr")).toBe(true);
    expect(plan.some((s) => s.kind === "tool" && s.name === "navigate")).toBe(true);
  });

  it("lists Delhi stations instead of picking one", () => {
    const plan = planFromTranscript("ambiguous Delhi");
    expect(plan[0]).toMatchObject({ kind: "tool", name: "lookup_station" });
  });

  it("suggests alternatives when there is no direct train", () => {
    const plan = planFromTranscript("no direct train");
    expect(plan.some((s) => s.kind === "tool" && s.name === "suggest_alternatives")).toBe(true);
  });

  it("treats an expired hold as a failed confirm", () => {
    const plan = planFromTranscript("expired hold");
    expect(plan[0]).toMatchObject({ kind: "tool", name: "confirm_booking" });
  });

  it("starts a booking hold without confirming in the same breath", () => {
    const plan = planFromTranscript("book 12951 from BCT to NDLS in 3A");
    expect(plan.some((s) => s.kind === "tool" && s.name === "start_booking")).toBe(true);
    expect(plan.some((s) => s.kind === "tool" && s.name === "confirm")).toBe(false);
  });

  it("returns home on a change of mind", () => {
    const plan = planFromTranscript("never mind, start over");
    expect(plan[0]).toMatchObject({ kind: "tool", name: "navigate", args: { href: "/" } });
  });
});
