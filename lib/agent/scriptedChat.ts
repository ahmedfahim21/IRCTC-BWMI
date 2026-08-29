import { createUIMessageStream, createUIMessageStreamResponse, getToolName, isToolUIPart } from "ai";
import { TOOLS, toolByName } from "@/lib/mcp/tools";
import { hasLiveChatCredentials } from "@/lib/agent/chatBackend";
import { todayIso, addDays } from "@/lib/domain/time";
import { isUiAction } from "./uiActions";

function lastUserText(body: {
  messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }>; content?: string }>;
}): string {
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
  const lower = query.toLowerCase().trim();
  if (/\bnew delhi\b|\bndls\b/.test(lower) || lower === "delhi") return "NDLS";
  if (/\bnizamuddin|\bnzm\b/.test(lower)) return "NZM";
  if (/\bmumbai|bombay|bct|mmct|csmt\b/.test(lower)) return "BCT";
  if (/\bhowrah|kolkata|hwh\b/.test(lower)) return "HWH";
  if (/\bchennai|madras|mas\b/.test(lower)) return "MAS";
  if (/\bbengaluru|bangalore|sbc\b/.test(lower)) return "SBC";
  if (/\bhyderabad|hyb|secunderabad|sc\b/.test(lower)) return "HYB";
  if (/\bkerala|kochi|ers\b/.test(lower)) return "ERS";
  return query.trim().toUpperCase();
}

function parseDate(lower: string, fallback: string): string {
  if (/\btoday\b/.test(lower)) return todayIso();
  if (/\btomorrow\b/.test(lower)) return addDays(todayIso(), 1);
  if (/\bnext week\b/.test(lower)) return addDays(todayIso(), 7);
  const iso = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const days = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (days) return addDays(todayIso(), Number(days[1]));
  return fallback;
}

export type SearchSession = { from: string; to: string; date: string; quota: string };

function defaultSession(): SearchSession {
  return { from: "NDLS", to: "BCT", date: addDays(todayIso(), 12), quota: "GN" };
}

/** Derive the active search session from prior turns instead of module state. */
export function deriveSessionFromMessages(
  messages: Array<{ role: string; parts?: Array<Record<string, unknown>> }>
): SearchSession {
  let session = defaultSession();

  for (const message of messages) {
    if (message.role === "assistant") {
      for (const part of message.parts ?? []) {
        if (!isToolUIPart(part as Parameters<typeof isToolUIPart>[0])) continue;
        const name = getToolName(part as Parameters<typeof getToolName>[0]);
        if (name !== "set_search") continue;
        const input = (part as { input?: Record<string, unknown> }).input;
        if (!input?.from || !input?.to || !input?.date) continue;
        session = {
          from: String(input.from),
          to: String(input.to),
          date: String(input.date),
          quota: String(input.quota ?? session.quota),
        };
      }
      continue;
    }

    if (message.role !== "user") continue;
    const text = (message.parts ?? [])
      .filter((part) => part.type === "text")
      .map((part) => String(part.text ?? ""))
      .join(" ");
    if (!text.trim()) continue;

    const lower = text.toLowerCase();
    const pair =
      lower.match(/\bfrom\s+([a-z0-9 :]+?)\s+to\s+([a-z0-9 :]+?)(?:\s|$)/i) ??
      lower.match(/\b([a-z]{2,6})\s+to\s+([a-z]{2,6})\b/i);
    if (pair) {
      session = {
        ...session,
        from: stationToken(pair[1]),
        to: stationToken(pair[2]),
        date: parseDate(lower, session.date),
      };
    }
  }

  return session;
}

/** @deprecated Tests may call this to reset — no-op now that session is stateless. */
export function resetScriptedSession() {
  // Session is derived per request from message history.
}

function searchSteps(from: string, to: string, date: string, quota = "GN"): Step[] {
  return [
    { kind: "tool", name: "lookup_station", args: { query: from } },
    { kind: "tool", name: "lookup_station", args: { query: to } },
    { kind: "tool", name: "search_trains", args: { from, to, date, quota } },
    { kind: "tool", name: "set_search", args: { from, to, date, quota } },
    { kind: "text", text: `Searching ${from} to ${to} on ${date}.` },
  ];
}

let callId = 0;
const id = () => `call_${++callId}`;

type Step =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; args: Record<string, unknown> };

/**
 * Canned sequences against the real MCP tools and UI actions. Used when
 * Live-chat credentials for the active provider are absent or CHAT_FAKE=1 so
 * Playwright can drive the
 * lifecycle without spending tokens or depending on the model.
 */
export function planFromTranscript(text: string, session: SearchSession = defaultSession()): Step[] {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const date = parseDate(lower, session.date);

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

  if (/\b(add meals?|with meals?|include meals?)\b/.test(lower)) {
    return [
      { kind: "tool", name: "set_options", args: { addMeals: true } },
      { kind: "text", text: "Meals added — the switch on the booking screen is on." },
    ];
  }

  if (/\b(insurance|travel insurance)\b/.test(lower) && /\b(remove|without|no|drop|disable|turn off)\b/.test(lower)) {
    const args: Record<string, unknown> = { travelInsurance: false };
    if (/\bauto[- ]?upgrade\b/.test(lower)) {
      args.autoUpgrade = false;
    }
    return [
      { kind: "tool", name: "set_options", args },
      { kind: "text", text: "Travel insurance is off." },
    ];
  }

  if (/\b(no auto[- ]?upgrade|without auto[- ]?upgrade|disable auto[- ]?upgrade)\b/.test(lower)) {
    return [
      { kind: "tool", name: "set_options", args: { autoUpgrade: false } },
      { kind: "text", text: "Auto-upgrade is off." },
    ];
  }

  if (/\bauto[- ]?upgrade\b/.test(lower) && /\b(turn off|switch off|remove|without|no|disable)\b/.test(lower)) {
    return [
      { kind: "tool", name: "set_options", args: { autoUpgrade: false } },
      { kind: "text", text: "Auto-upgrade is off." },
    ];
  }

  if (
    /\b(no meals?|without meals?|remove meals?|drop meals?)\b/.test(lower) ||
    (/\bmeals?\b/.test(lower) && /\b(remove|without|no|drop|disable|turn off)\b/.test(lower))
  ) {
    return [
      { kind: "tool", name: "set_options", args: { addMeals: false } },
      { kind: "text", text: "Meals turned off." },
    ];
  }

  if (/\b(insurance)\b/.test(lower) && /\b(add|with|include|on)\b/.test(lower)) {
    return [
      { kind: "tool", name: "set_options", args: { travelInsurance: true } },
      { kind: "text", text: "Travel insurance is on." },
    ];
  }

  if (/\b(seat|berth|coach (?:layout|diagram)|lower berth)\b/.test(lower) && !/\bbook\s+\d{5}\b/.test(lower)) {
    const berthType = /\blower\b/.test(lower) ? "LB" : /\bmiddle\b/.test(lower) ? "MB" : /\bupper\b/.test(lower) ? "UB" : undefined;
    return [
      { kind: "tool", name: "select_berth", args: { coach: "B1", berth: 1, ...(berthType ? { berthType } : {}) } },
      { kind: "text", text: "The coach diagram is on the booking screen. I picked a free berth." },
    ];
  }

  const originChange =
    lower.match(/\b(?:change|switch)\s+(?:the\s+)?(?:origin|from(?:\s+station)?)\s+to\s+(.+)/i) ??
    lower.match(/\b(?:actually|instead)\s+from\s+([a-z0-9 :]+)/i);
  if (originChange) {
    const from = stationToken(originChange[1]);
    return searchSteps(from, session.to, date, session.quota);
  }

  const destChange =
    lower.match(/\b(?:change|switch)\s+(?:the\s+)?(?:destination|to(?:\s+station)?)\s+to\s+(.+)/i) ??
    lower.match(/\b(?:actually|instead)\s+(?:go\s+)?to\s+([a-z0-9 :]+)/i);
  if (destChange && !/\bfrom\s+/.test(lower)) {
    const to = stationToken(destChange[1]);
    return searchSteps(session.from, to, date, session.quota);
  }

  if (/\bchange (?:the )?date\b|\bgo on\b|\btravel on\b|\b(?:different|another) date\b/.test(lower)) {
    return searchSteps(session.from, session.to, date, session.quota);
  }

  if (/\b(delhi)\b/.test(lower) && /\b(mumbai|bombay)\b/.test(lower) && !/\b(ndls|new delhi|nzm|dli)\b/.test(lower)) {
    return [
      { kind: "tool", name: "lookup_station", args: { query: "Delhi" } },
      { kind: "text", text: "Delhi has more than one station. **NDLS (New Delhi)** and **NZM (Hazrat Nizamuddin)** are the usual choices." },
    ];
  }

  if (/\bonly delhi\b|\bambiguous\b|^delhi$/.test(lower)) {
    return [
      { kind: "tool", name: "lookup_station", args: { query: "Delhi" } },
      { kind: "text", text: "Delhi has more than one station. **NDLS (New Delhi)** and **NZM (Hazrat Nizamuddin)** are the usual choices." },
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
      { kind: "tool", name: "set_contact", args: { phone: "9876543210", email: "" } },
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
    return searchSteps(from, to, date, "GN");
  }

  return [
    {
      kind: "text",
      text: `Which stations, and on which date? I can search trains, change a journey already on screen, pick a berth, or look up a PNR. You said: "${raw}"`,
    },
  ];
}

export async function scriptedChatResponse(body: unknown): Promise<Response> {
  const payload = body as {
    messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }>; content?: string }>;
  };
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
  const session = deriveSessionFromMessages(payload.messages ?? []);
  const plan = planFromTranscript(text, session);

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
              const href = `/book/${draftId}`;
              writer.write({ type: "tool-input-start", toolCallId: navId, toolName: "navigate" });
              writer.write({
                type: "tool-input-available",
                toolCallId: navId,
                toolName: "navigate",
                input: { href },
              });
            }
          }
          if (step.name === "confirm_booking") {
            const pnr = (result.data as { pnr?: string } | undefined)?.pnr;
            if (pnr) {
              const navId = id();
              const href = `/trips/${pnr}`;
              writer.write({ type: "tool-input-start", toolCallId: navId, toolName: "navigate" });
              writer.write({
                type: "tool-input-available",
                toolCallId: navId,
                toolName: "navigate",
                input: { href },
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
  return !hasLiveChatCredentials() || process.env.CHAT_FAKE === "1";
}
