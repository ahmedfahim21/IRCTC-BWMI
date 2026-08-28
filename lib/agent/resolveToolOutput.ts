import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { IntentResult } from "./agentStore";
import { isUiAction } from "./uiActions";

type ChatLike = {
  messages: UIMessage[];
  addToolOutput: (args: {
    tool: string;
    toolCallId: string;
    output: IntentResult;
  }) => void | PromiseLike<void>;
  setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void;
};

export function findToolMessageIndex(messages: UIMessage[], toolCallId: string): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const parts = messages[index]?.parts ?? [];
    if (
      parts.some(
        (part) => isToolUIPart(part) && "toolCallId" in part && String(part.toolCallId) === toolCallId
      )
    ) {
      return index;
    }
  }
  return -1;
}

function toolPartState(messages: UIMessage[], toolCallId: string): string | null {
  const index = findToolMessageIndex(messages, toolCallId);
  if (index < 0) return null;
  const part = messages[index]?.parts?.find(
    (entry) => isToolUIPart(entry) && "toolCallId" in entry && String(entry.toolCallId) === toolCallId
  );
  return part && "state" in part ? String(part.state) : null;
}

function patchToolOutput(messages: UIMessage[], toolCallId: string, result: IntentResult): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: (message.parts ?? []).map((part) => {
      if (!isToolUIPart(part) || !("toolCallId" in part) || String(part.toolCallId) !== toolCallId) {
        return part;
      }
      return {
        ...part,
        state: "output-available" as const,
        output: result,
      } as typeof part;
    }),
  }));
}

/** Attach tool output to the message that owns the call — not always the last message. */
export async function resolveUiToolOutput(
  chat: ChatLike,
  tool: string,
  toolCallId: string,
  result: IntentResult
): Promise<void> {
  let messages = chat.messages;
  let index = findToolMessageIndex(messages, toolCallId);

  if (index < 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    messages = chat.messages;
    index = findToolMessageIndex(messages, toolCallId);
  }

  if (index < 0) return;

  if (index === messages.length - 1) {
    await chat.addToolOutput({ tool, toolCallId, output: result });
    if (toolPartState(chat.messages, toolCallId) === "output-available") return;
  }

  chat.setMessages(patchToolOutput(chat.messages, toolCallId, result));
}

export function hasPendingUiToolCalls(messages: UIMessage[]): boolean {
  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (!isToolUIPart(part)) continue;
      if (!isUiAction(getToolName(part))) continue;
      const state = "state" in part ? String(part.state) : "";
      if (state !== "output-available" && state !== "output-error") return true;
    }
  }
  return false;
}
