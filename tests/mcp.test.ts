import { describe, expect, it } from "vitest";
import { POST, GET } from "@/app/api/mcp/route";
import { NextRequest } from "next/server";
import { TOOLS } from "@/lib/mcp/tools";

const rpc = (method: string, params?: Record<string, unknown>, id: number | string | null = 1) =>
  new NextRequest("http://localhost:3277/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

const send = async (method: string, params?: Record<string, unknown>) => (await POST(rpc(method, params))).json();

describe("MCP server", () => {
  it("completes the initialize handshake", async () => {
    const body = await send("initialize", { protocolVersion: "2025-06-18", capabilities: {} });
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(1);
    expect(body.result.protocolVersion).toBe("2025-06-18");
    expect(body.result.serverInfo.name).toBe("irctc-rail");
    expect(body.result.capabilities.tools).toBeDefined();
    expect(body.result.instructions).toContain("simulated");
  });

  it("answers ping", async () => {
    expect((await send("ping")).result).toEqual({});
  });

  it("accepts the initialized notification without a body", async () => {
    const response = await POST(rpc("notifications/initialized", {}, null));
    expect(response.status).toBe(202);
  });

  it("lists every tool with a usable schema", async () => {
    const body = await send("tools/list");
    expect(body.result.tools).toHaveLength(TOOLS.length);
    for (const tool of body.result.tools) {
      expect(tool.name).toMatch(/^[a-z_]+$/);
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
      // Every declared required field must actually exist in properties.
      for (const required of tool.inputSchema.required ?? []) {
        expect(Object.keys(tool.inputSchema.properties), `${tool.name}.${required}`).toContain(required);
      }
    }
  });

  it("rejects an unknown method as a protocol error", async () => {
    const body = await send("nonsense/method");
    expect(body.error.code).toBe(-32601);
  });

  it("rejects an unknown tool", async () => {
    const body = await send("tools/call", { name: "no_such_tool", arguments: {} });
    expect(body.error.code).toBe(-32602);
  });

  it("reports a missing argument as a tool error, not a broken connection", async () => {
    const body = await send("tools/call", { name: "search_trains", arguments: { from: "NDLS" } });
    expect(body.error).toBeUndefined();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("to");
  });

  it("rejects a value outside an enum", async () => {
    const body = await send("tools/call", {
      name: "search_trains",
      arguments: { from: "NDLS", to: "HWH", quota: "NOPE" },
    });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("quota must be one of");
  });

  it("runs a real tool and returns text plus structured data", async () => {
    const body = await send("tools/call", { name: "lookup_station", arguments: { query: "NDLS" } });
    expect(body.result.isError).toBeUndefined();
    expect(body.result.content[0].type).toBe("text");
    expect(body.result.content[0].text).toContain("NDLS");
    expect(body.result.structuredContent.result).toBeInstanceOf(Array);
  });

  it("holds and confirms a booking end to end", async () => {
    const journeyDate = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);

    const held = await send("tools/call", {
      name: "start_booking",
      arguments: {
        trainNumber: "12951",
        journeyDate,
        fromCode: "BCT",
        toCode: "NDLS",
        classCode: "3A",
        passengers: [{ name: "Ahmed Fahim", age: 29, gender: "male" }],
      },
    });
    const draftId = held.result.structuredContent.result.draftId;
    expect(draftId).toMatch(/^dft_/);
    expect(held.result.content[0].text).toContain("confirm_booking");

    const confirmed = await send("tools/call", { name: "confirm_booking", arguments: { draftId } });
    const booking = confirmed.result.structuredContent.result;
    expect(booking.pnr).toMatch(/^\d{10}$/);
    expect(booking.passengers[0].name).toBe("Ahmed Fahim");
    expect(confirmed.result.content[0].text).toContain("simulated");

    const looked = await send("tools/call", { name: "get_pnr", arguments: { pnr: booking.pnr } });
    expect(looked.result.content[0].text).toContain(booking.pnr);
    expect(looked.result.content[0].text).toContain("Ahmed Fahim");
  });

  it("turns a thrown tool error into an isError result rather than a 500", async () => {
    const body = await send("tools/call", { name: "confirm_booking", arguments: { draftId: "dft_does_not_exist" } });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("confirm_booking failed");
  });

  it("serves a human-readable summary on GET", async () => {
    const body = await (await GET()).json();
    expect(body.name).toBe("irctc-rail");
    expect(body.transport).toBe("streamable-http");
    expect(body.tools).toHaveLength(TOOLS.length);
    expect(body.usage).toContain("initialize");
  });
});
