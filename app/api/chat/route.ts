import { z } from "zod";
import { jsonSchema, isStepCount, streamText, tool, convertToModelMessages, type ToolSet } from "ai";
import { TOOLS } from "@/lib/mcp/tools";
import { clientUiTools } from "@/lib/agent/uiActions";
import { scriptedChatResponse, useFakeChat } from "@/lib/agent/scriptedChat";
import { buildChatSystemPrompt } from "@/lib/agent/prompt";
import { repairChatMessages } from "@/lib/agent/messageRepair";
import { chatModel } from "@/lib/agent/chatBackend";
import type { AgentAppState } from "@/lib/agent/agentStore";

const chatBodySchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())).default([]),
  appState: z.record(z.string(), z.unknown()).optional(),
});

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (useFakeChat()) {
    return scriptedChatResponse(body);
  }

  const parsed = chatBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid chat request.", details: parsed.error.flatten() }, { status: 400 });
  }

  const repaired = repairChatMessages(parsed.data.messages as unknown as Parameters<typeof repairChatMessages>[0]);
  const appState = (parsed.data.appState ?? null) as AgentAppState | null;

  try {
    const result = streamText({
      model: chatModel(),
      system: buildChatSystemPrompt(appState),
      messages: await convertToModelMessages(repaired, {
        tools: { ...serverTools(), ...clientUiTools() },
        ignoreIncompleteToolCalls: true,
      }),
      tools: { ...serverTools(), ...clientUiTools() },
      stopWhen: isStepCount(12),
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => (error instanceof Error ? error.message : "Chat stream failed."),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process chat history.";
    return Response.json({ error: message }, { status: 400 });
  }
}
