import { jsonSchema, isStepCount, streamText, tool, convertToModelMessages, type ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { TOOLS, serverInstructions } from "@/lib/mcp/tools";
import { clientUiTools } from "@/lib/agent/uiActions";
import { scriptedChatResponse, useFakeChat } from "@/lib/agent/scriptedChat";
import { todayIso } from "@/lib/domain/time";

/** Hardcoded. No picker. Sonnet, not Haiku. */
const CHAT_MODEL = "claude-sonnet-4-5" as const;

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
      ` Today is ${todayIso()}. Treat “tomorrow” as the next calendar day after that, never a date in another year.` +
      " Talk like a booking clerk at a window: short, specific, no filler." +
      " Ask a short question when a city has more than one station, when the date is missing, or when they have not said a class." +
      " If they change a station or the whole journey mid-conversation, look up the new pair and call set_search again — do not keep searching the old pair." +
      " After a server tool, always drive the UI with navigate, set_search, open_train, select_class, select_berth, set_passengers, set_contact, set_options, confirm, or highlight so the screens move with you." +
      " When they ask for meals, insurance, keep-together or auto-upgrade, call set_options so the switches on the booking screen move." +
      " After start_booking, navigate to the draft so the berth map is on screen. Never claim a real ticket was issued.",
    messages: await convertToModelMessages(body.messages),
    tools: { ...serverTools(), ...clientUiTools() },
    stopWhen: isStepCount(12),
  });

  return result.toUIMessageStreamResponse();
}
