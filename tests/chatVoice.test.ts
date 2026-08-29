import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { assistantMessageText, lastAssistantText } from "@/lib/voice/chatVoice";

describe("assistantMessageText", () => {
  it("returns text parts from one assistant message", () => {
    const message = {
      id: "a1",
      role: "assistant",
      parts: [
        { type: "text", text: "नमस्ते" },
        { type: "tool-invocation", toolName: "set_search", toolCallId: "t1", state: "output-available" },
      ],
    } as Parameters<typeof assistantMessageText>[0];

    expect(assistantMessageText(message)).toBe("नमस्ते");
  });
});

describe("lastAssistantText", () => {
  it("returns text parts from the latest assistant message", () => {
    const messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "नमस्ते" },
          { type: "tool-invocation", toolName: "set_search", toolCallId: "t1", state: "output-available" },
        ],
      },
    ] as UIMessage[];

    expect(lastAssistantText(messages)).toBe("नमस्ते");
  });

  it("skips assistant messages that only contain tool parts", () => {
    const messages = [
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "tool-invocation", toolName: "navigate", toolCallId: "t1", state: "output-available" }],
      },
      { id: "a2", role: "assistant", parts: [{ type: "text", text: "Done." }] },
    ] as UIMessage[];

    expect(lastAssistantText(messages)).toBe("Done.");
  });

  it("returns empty when there is no assistant text", () => {
    expect(lastAssistantText([])).toBe("");
  });
});

describe("voice listen contract", () => {
  it("documents the slim STT-only response shape", () => {
    const sample = {
      transcript: "दिल्ली से मुंबई",
      languageCode: "hi-IN",
      confidence: 0.91,
    };
    expect(sample).toMatchObject({
      transcript: expect.any(String),
      languageCode: expect.any(String),
      confidence: expect.any(Number),
    });
    expect(sample).not.toHaveProperty("intent");
    expect(sample).not.toHaveProperty("audio");
  });
});
