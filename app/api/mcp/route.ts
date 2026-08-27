import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { TOOLS, toolByName, SERVER_INFO, serverInstructions } from "@/lib/mcp/tools";

/**
 * Model Context Protocol endpoint, Streamable HTTP transport.
 *
 * Exposes the platform's capabilities as tools so an agent can do what a person
 * can: find a train, read availability, track a running service, hold and
 * confirm a booking. JSON-RPC 2.0 over a single POST — no SSE stream is opened,
 * because every tool here answers in one shot.
 *
 * Point a client at:  http://localhost:3277/api/mcp
 */
const PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const ok = (id: JsonRpcRequest["id"], result: unknown) =>
  NextResponse.json({ jsonrpc: "2.0", id, result });

const fail = (id: JsonRpcRequest["id"], code: number, message: string, data?: unknown) =>
  NextResponse.json({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });

/** Required-field check against a tool's declared inputSchema. */
function validate(schema: Record<string, unknown>, args: Record<string, unknown>): string | null {
  const required = (schema.required as string[]) ?? [];
  const missing = required.filter((key) => args[key] === undefined || args[key] === null || args[key] === "");
  if (missing.length) return `Missing required argument(s): ${missing.join(", ")}`;

  const properties = (schema.properties ?? {}) as Record<string, { enum?: string[] }>;
  for (const [key, value] of Object.entries(args)) {
    const spec = properties[key];
    if (spec?.enum && typeof value === "string" && !spec.enum.includes(value)) {
      return `${key} must be one of: ${spec.enum.join(", ")}`;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return fail(null, -32700, "Parse error: body was not valid JSON");
  }

  const { id = null, method, params = {} } = body;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: serverInstructions(),
      });

    // Fire-and-forget notification; the spec expects no response body.
    case "notifications/initialized":
    case "notifications/cancelled":
      return new NextResponse(null, { status: 202 });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, {
        tools: TOOLS.map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });

    case "tools/call": {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const tool = toolByName(name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${name}`);

      const invalid = validate(tool.inputSchema, args);
      if (invalid) {
        // A bad call is a tool-level error, not a protocol error — the agent
        // should see it and correct itself rather than the connection breaking.
        return ok(id, { content: [{ type: "text", text: invalid }], isError: true });
      }

      try {
        const result = await tool.run(args);
        return ok(id, {
          content: [{ type: "text", text: result.text }],
          ...(result.data !== undefined ? { structuredContent: { result: result.data } } : {}),
        });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Tool failed";
        console.error(`[mcp] ${name}:`, message);
        return ok(id, { content: [{ type: "text", text: `${name} failed: ${message}` }], isError: true });
      }
    }

    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

/**
 * The transport is POST-only. Answer GET with something a human poking at the
 * URL can actually use, rather than a bare 405.
 */
export async function GET() {
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      title: SERVER_INFO.title,
      version: SERVER_INFO.version,
      protocolVersion: PROTOCOL_VERSION,
      transport: "streamable-http",
      instructions: serverInstructions(),
      tools: TOOLS.map((t) => ({ name: t.name, title: t.title, description: t.description })),
      usage: "POST JSON-RPC 2.0 to this URL. Start with the `initialize` method, then `tools/list`.",
    },
    { status: 200, headers: { Allow: "GET, POST" } }
  );
}
