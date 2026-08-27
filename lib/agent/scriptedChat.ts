import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { TOOLS, toolByName } from "@/lib/mcp/tools";
import { todayIso, addDays } from "@/lib/domain/time";
import { isUiAction } from "./uiActions";

function lastUserText(body: { messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }>; content?: string }> }): string {
  const messages = body.messages ?? [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    if (typeof message.content === "string") return message.content;
    const text = (message.parts ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join(" ");
    if (text) return text;
  }
  return "";
}

function stationToken(query: string): string {
  const lower = query.toLowerCase();
  if (/\bnew delhi\b|\bndls\b/.test(lower) || lower === "delhi") return "NDLS";
  if (/\bmumbai|bombay|bct|mmct|csmt\b/.test(lower)) return "BCT";
  if (/\bhowrah|kolkata|hwh\b/.test(lower)) return "HWH";
  if (/\bchennai|madras|mas\b/.test(lower)) return "MAS";
  if (/\bbengaluru|bangalore|sbc\b/.test(lower)) return "SBC";
  if (/\bkerala|kochi|ers\b/.test(lower)) return "ERS";
  return query.trim().toUpperCase();
}

let callId = 0;
const id = () => `call_${++callId}`;

type Step =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; args: Record<string, unknown> };

/**
 * Canned sequences against the real MCP tools and UI actions. Used when
 * ANTHROPIC_API_KEY is absent or CHAT_FAKE=1 so Playwright can drive the
 * lifecycle without spending tokens or depending on the model.
 */
export function planFromTranscript(text: string): Step[] {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const date = addDays(todayIso(), 12);

  if (/\bexpired\b/.test(lower)) {
    return [
      { kind: "tool", name: "confirm_booking", args: { draftId: "dft_expired" } },
      { kind: "text", text: "That hold has expired. Start the booking again." },
    ];
  }

  if (/\b(never mind|change of mind|start over)\b/.test(lower)) {
    return [
      { kind: "tool", name: "navigate", args: { href: "/" } },
      { kind: "text", text: "Back to search." },
    ];
  }

  const pnr = lower.match(/\b(\d{10})\b/);
  if (pnr && /\bpnr\b/.test(lower)) {
    return [
      { kind: "tool", name: "get_pnr", args: { pnr: pnr[1] } },
      { kind: "tool", name: "navigate", args: { href: `/trips/${pnr[1]}` } },
      { kind: "text", text: `Opening PNR ${pnr[1]}.` },
    ];
  }

  if (/\b(delhi)\b/.test(lower) && /\b(mumbai|bombay)\b/.test(lower) && !/\b(ndls|new delhi|nzm|dli)\b/.test(lower)) {
    return [
      { kind: "tool", name: "lookup_station", args: { query: "Delhi" } },
      { kind: "text", text: "Delhi has more than one station. NDLS (New Delhi) and NZM (Hazrat Nizamuddin) are the usual choices." },
    ];
  }

  if (/\bonly delhi\b|\bambiguous\b|^delhi$/.test(lower)) {
    return [
      { kind: "tool", name: "lookup_station", args: { query: "Delhi" } },
      { kind: "text", text: "Delhi has more than one station. NDLS (New Delhi) and NZM (Hazrat Nizamuddin) are the usual choices." },
    ];
  }

  if (/\bno direct\b/.test(lower)) {
    return [
      { kind: "tool", name: "search_trains", args: { from: "NDLS", to: "ERS", date } },
      { kind: "tool", name: "suggest_alternatives", args: { from: "NDLS", to: "ERS", date, classCode: "SL" } },
      { kind: "text", text: "No direct train. Here are other ways to get there." },
    ];
  }

  const book = lower.match(/\bbook\s+(\d{5})\b/);
  if (book) {
    const trainNumber = book[1];
    const from = "BCT";
    const to = "NDLS";
    const classCode = /\bsl\b/.test(lower) ? "SL" : "3A";
    return [
      {
        kind: "tool",
        name: "start_booking",
        args: {
          trainNumber,
          journeyDate: date,
          fromCode: from,
          toCode: to,
          classCode,
          passengers: [{ name: "Ahmed Fahim", age: 32, gender: "male" }],
        },
      },
      { kind: "text", text: "Hold placed. Fill contact and confirm when the booking screen is up." },
    ];
  }

  if (/\bconfirm\b/.test(lower) || /\bcontact\b/.test(lower)) {
    return [
      { kind: "tool", name: "set_contact", args: { phone: "9876543210" } },
      { kind: "tool", name: "select_berth", args: { coach: "B1", berth: 1 } },
      { kind: "tool", name: "confirm", args: {} },
      { kind: "text", text: "Confirming." },
    ];
  }

  const pair =
    lower.match(/\bfrom\s+([a-z0-9 :]+?)\s+to\s+([a-z0-9 :]+?)(?:\s|$)/i) ??
    lower.match(/\b([a-z]{2,6})\s+to\s+([a-z]{2,6})\b/i);

  if (pair) {
    const from = stationToken(pair[1]);
    const to = stationToken(pair[2]);
    return [
      { kind: "tool", name: "lookup_station", args: { query: from } },
      { kind: "tool", name: "lookup_station", args: { query: to } },
      { kind: "tool", name: "search_trains", args: { from, to, date, quota: "GN" } },
      { kind: "tool", name: "set_search", args: { from, to, date, quota: "GN" } },
      { kind: "text", text: `Searching ${from} to ${to} on ${date}.` },
    ];
  }

  return [{ kind: "text", text: `I can search trains, book a berth, or look up a PNR. You said: "${raw}"` }];
}

export async function scriptedChatResponse(body: unknown): Promise<Response> {
  const payload = body as { messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }>; content?: string }> };
  const last = payload.messages?.[payload.messages.length - 1];
  if (last && last.role !== "user") {
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "start" });
        writer.write({ type: "finish", finishReason: "stop" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
  const text = lastUserText(payload);
  const plan = planFromTranscript(text);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });

      for (const step of plan) {
        if (step.kind === "text") {
          const textId = id();
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: step.text });
          writer.write({ type: "text-end", id: textId });
          continue;
        }

        const toolCallId = id();
        writer.write({ type: "tool-input-start", toolCallId, toolName: step.name });
        writer.write({ type: "tool-input-available", toolCallId, toolName: step.name, input: step.args });

        if (isUiAction(step.name)) {
          writer.write({
            type: "tool-output-available",
            toolCallId,
            output: { ok: true, action: step.name, input: step.args },
          });
          continue;
        }

        const runner = toolByName(step.name) ?? TOOLS.find((t) => t.name === step.name);
        if (!runner) {
          writer.write({ type: "tool-output-error", toolCallId, errorText: `Unknown tool ${step.name}` });
          continue;
        }
        try {
          const result = await runner.run(step.args);
          writer.write({ type: "tool-output-available", toolCallId, output: result });
          if (step.name === "start_booking") {
            const draftId = (result.data as { draftId?: string } | undefined)?.draftId;
            if (draftId) {
              const navId = id();
              writer.write({ type: "tool-input-start", toolCallId: navId, toolName: "navigate" });
              writer.write({
                type: "tool-input-available",
                toolCallId: navId,
                toolName: "navigate",
                input: { href: `/book/${draftId}` },
              });
              writer.write({
                type: "tool-output-available",
                toolCallId: navId,
                output: { ok: true, action: "navigate", input: { href: `/book/${draftId}` } },
              });
            }
          }
          if (step.name === "confirm_booking") {
            const pnr = (result.data as { pnr?: string } | undefined)?.pnr;
            if (pnr) {
              const navId = id();
              writer.write({ type: "tool-input-start", toolCallId: navId, toolName: "navigate" });
              writer.write({
                type: "tool-input-available",
                toolCallId: navId,
                toolName: "navigate",
                input: { href: `/trips/${pnr}` },
              });
              writer.write({
                type: "tool-output-available",
                toolCallId: navId,
                output: { ok: true, action: "navigate", input: { href: `/trips/${pnr}` } },
              });
            }
          }
        } catch (error) {
          writer.write({
            type: "tool-output-error",
            toolCallId,
            errorText: error instanceof Error ? error.message : "Tool failed",
          });
        }
      }

      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export function useFakeChat(): boolean {
  return !process.env.ANTHROPIC_API_KEY || process.env.CHAT_FAKE === "1";
}
