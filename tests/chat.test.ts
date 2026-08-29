import { describe, expect, it } from "vitest";
import { planFromTranscript, useFakeChat, deriveSessionFromMessages } from "@/lib/agent/scriptedChat";
import { repairChatMessages } from "@/lib/agent/messageRepair";
import { buildChatSystemPrompt } from "@/lib/agent/prompt";
import type { AgentAppState } from "@/lib/agent/agentStore";

describe("scripted chat planner", () => {
  it("uses the scripted path when live-chat credentials are absent", () => {
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

  it("derives session from prior set_search tool output", () => {
    const session = deriveSessionFromMessages([
      {
        role: "assistant",
        parts: [
          {
            type: "tool-set_search",
            toolName: "set_search",
            toolCallId: "1",
            state: "output-available",
            input: { from: "NDLS", to: "BCT", date: "2026-09-01", quota: "GN" },
            output: { ok: true },
          },
        ],
      },
    ]);
    expect(session).toMatchObject({ from: "NDLS", to: "BCT", date: "2026-09-01" });
  });

  it("repairs dangling UI tool calls", () => {
    const repaired = repairChatMessages([
      {
        id: "m1",
        role: "assistant",
        parts: [
          {
            type: "tool-select_berth",
            toolName: "select_berth",
            toolCallId: "tc1",
            state: "input-available",
            input: { coach: "B1", berth: 1 },
          },
        ],
      },
    ]);
    const part = repaired[0]?.parts?.[0];
    expect(part && "state" in part && part.state).toBe("output-available");
    expect(part && "output" in part && (part.output as { ok: boolean }).ok).toBe(false);
  });

  it("renders app state into the system prompt", () => {
    const appState: AgentAppState = {
      route: "/search?from=NDLS&to=BCT",
      search: { from: "NDLS", to: "BCT", date: "2026-09-01", quota: "GN" },
      searchResults: null,
      booking: null,
      berths: null,
    };
    const prompt = buildChatSystemPrompt(appState);
    expect(prompt).toContain("On screen right now");
    expect(prompt).toContain("NDLS");
  });
});
