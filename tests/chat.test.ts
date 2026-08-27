import { describe, expect, it } from "vitest";
import { planFromTranscript } from "@/lib/agent/scriptedChat";

describe("scripted chat planner", () => {
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
});
