import { jsonSchema, isStepCount, streamText, tool, convertToModelMessages, type ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { TOOLS, serverInstructions } from "@/lib/mcp/tools";
import { clientUiTools } from "@/lib/agent/uiActions";
import { scriptedChatResponse, useFakeChat } from "@/lib/agent/scriptedChat";

/** Hardcoded. No picker. Haiku, not Sonnet/Opus. */
const CHAT_MODEL = "claude-haiku-4-5" as const;

function serverTools(): ToolSet {
  const tools: ToolSet = {};
  for (const mcp of TOOLS) {
    tools[mcp.name] = tool({
      description: mcp.description,
      inputSchema: jsonSchema(mcp.inputSchema),
      execute: async (args) => mcp.run(args),
    });
  }
  return tools;
}

export async function POST(request: Request) {
  const body = await request.json();

  if (useFakeChat()) {
    return scriptedChatResponse(body);
  }

  const result = streamText({
    model: anthropic(CHAT_MODEL),
    system:
      serverInstructions() +
      " Talk like a booking clerk at a window: short, specific, no filler. After a server tool, always drive the UI with navigate, set_search, open_train, select_class, select_berth, set_passengers, set_contact, confirm, or highlight so the screens move with you. Ask when a station name is ambiguous. Never claim a real ticket was issued.",
    messages: await convertToModelMessages(body.messages),
    tools: { ...serverTools(), ...clientUiTools() },
    stopWhen: isStepCount(8),
  });

  return result.toUIMessageStreamResponse();
}
