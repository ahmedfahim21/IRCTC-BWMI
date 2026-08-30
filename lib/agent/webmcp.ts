"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { applyAgentTool } from "@/lib/agent/useAgentActions";
import { compactAppState } from "@/lib/agent/agentStore";
import { UI_ACTION_DEFINITIONS } from "@/lib/agent/uiActions";

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type ModelContext = {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void>;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

export function webMcpSupported(): boolean {
  return typeof document !== "undefined" && typeof document.modelContext?.registerTool === "function";
}

const CONTEXT_TOOLS: WebMcpTool[] = [
  {
    name: "get_page_title",
    description: "Read the title of the current page.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => ({ title: document.title }),
  },
  {
    name: "get_page_state",
    description:
      "Read the app's current route, search form, highlighted train, booking draft, and berth map as seen in the UI.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => ({
      url: window.location.href,
      state: compactAppState(),
    }),
  },
];

function uiActionTools(): WebMcpTool[] {
  return UI_ACTION_DEFINITIONS.map((def) => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    execute: async (input) => applyAgentTool(def.name, input),
  }));
}

export async function registerWebMcpTools(signal: AbortSignal): Promise<void> {
  const modelContext = document.modelContext;
  if (!modelContext?.registerTool) return;

  for (const tool of [...CONTEXT_TOOLS, ...uiActionTools()]) {
    await modelContext.registerTool(tool, { signal });
  }
}

/** Expose UI actions to ChatGPT Site tools and other WebMCP agents in the same tab. */
export function WebMcpRegistrar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!webMcpSupported()) return;

    const controller = new AbortController();
    void registerWebMcpTools(controller.signal).catch(() => {
      // WebMCP is experimental; ignore registration failures on unsupported builds.
    });

    return () => controller.abort();
  }, [pathname, search]);

  return null;
}
