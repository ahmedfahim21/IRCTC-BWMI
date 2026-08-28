import { describe, expect, it } from "vitest";
import { resolveUiToolOutput, findToolMessageIndex } from "@/lib/agent/resolveToolOutput";
import type { UIMessage } from "ai";

describe("resolveUiToolOutput", () => {
  it("patches a tool on an earlier assistant message when the user has sent another turn", async () => {
    const messages: UIMessage[] = [
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-set_options",
            toolCallId: "tc1",
            state: "input-available",
            input: { addMeals: false },
          } as UIMessage["parts"][number],
        ],
      },
      { id: "u1", role: "user", parts: [{ type: "text", text: "thanks" }] },
    ];

    let current = messages;
    const chat = {
      get messages() {
        return current;
      },
      addToolOutput: async () => {
        throw new Error("should not use last-message shortcut");
      },
      setMessages: (next: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => {
        current = typeof next === "function" ? next(current) : next;
      },
    };

    expect(findToolMessageIndex(messages, "tc1")).toBe(0);

    await resolveUiToolOutput(chat, "set_options", "tc1", { ok: true, detail: "Updated meals" });

    const part = current[0]?.parts?.[0];
    expect(part && "state" in part && part.state).toBe("output-available");
    expect(part && "output" in part && (part.output as { detail?: string }).detail).toBe("Updated meals");
  });
});
