import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { isUiAction } from "./uiActions";

const INCOMPLETE_STATES = new Set(["input-streaming", "input-available"]);

const NOT_EXECUTED_OUTPUT = { ok: false, error: "not executed" } as const;

type RepairablePart = {
  type: string;
  state?: string;
  toolCallId?: string;
  output?: unknown;
};

function repairPart(part: RepairablePart): RepairablePart {
  if (!isToolUIPart(part as Parameters<typeof isToolUIPart>[0])) return part;
  const name = getToolName(part as Parameters<typeof getToolName>[0]);
  if (!isUiAction(name)) return part;
  if (!part.state || !INCOMPLETE_STATES.has(part.state)) return part;
  return {
    ...part,
    state: "output-available",
    output: NOT_EXECUTED_OUTPUT,
  };
}

/** Repair dangling UI tool calls so convertToModelMessages never throws. */
export function repairChatMessages<T extends UIMessage>(messages: T[]): T[] {
  let changed = false;
  const repaired = messages.map((message) => {
    const parts = message.parts?.map((part) => {
      const next = repairPart(part as RepairablePart);
      if (next !== part) changed = true;
      return next;
    });
    if (!parts || parts === message.parts) return message;
    return { ...message, parts } as T;
  });
  return changed ? repaired : messages;
}
