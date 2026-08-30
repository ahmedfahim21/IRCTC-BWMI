import { describe, expect, it, vi } from "vitest";
import { UI_ACTION_DEFINITIONS, UI_ACTION_NAMES } from "@/lib/agent/uiActions";
import { registerWebMcpTools, webMcpSupported } from "@/lib/agent/webmcp";

describe("webmcp", () => {
  it("exports one definition per UI action", () => {
    expect(UI_ACTION_DEFINITIONS.map((def) => def.name)).toEqual([...UI_ACTION_NAMES]);
  });

  it("reports unsupported when modelContext is missing", () => {
    expect(webMcpSupported()).toBe(false);
  });

  it("registers context tools and every UI action", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("document", { modelContext: { registerTool } });

    const controller = new AbortController();
    await registerWebMcpTools(controller.signal);

    expect(registerTool).toHaveBeenCalledTimes(UI_ACTION_DEFINITIONS.length + 2);
    expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
      "get_page_title",
      "get_page_state",
      ...UI_ACTION_NAMES,
    ]);

    vi.unstubAllGlobals();
  });
});
