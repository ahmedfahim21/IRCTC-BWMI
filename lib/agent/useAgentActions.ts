"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { agentStore, compactAppState, type IntentResult } from "./agentStore";
import { isUiAction, type UiActionName } from "./uiActions";
import type { ClassCode } from "@/lib/types";

function waitForNavigation(expectedHref: string): Promise<void> {
  return new Promise((resolve) => {
    const target = new URL(expectedHref, window.location.origin);

    const matches = () => {
      const here = new URL(window.location.href);
      if (here.pathname !== target.pathname) return false;
      for (const [key, value] of target.searchParams.entries()) {
        if (here.searchParams.get(key) !== value) return false;
      }
      return true;
    };

    if (matches()) {
      resolve();
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (matches() || Date.now() - started > 4000) {
        window.clearInterval(timer);
        resolve();
      }
    }, 50);
  });
}

function navigate(href: string): Promise<IntentResult> {
  window.dispatchEvent(new CustomEvent("irctc:agent-navigate", { detail: { href } }));
  return waitForNavigation(href).then(() => ({
    ok: true,
    detail: `Opened ${href}`,
    state: compactAppState(),
  }));
}

export async function applyAgentTool(
  name: string,
  input: Record<string, unknown>
): Promise<IntentResult> {
  if (!isUiAction(name)) {
    return { ok: false, error: `Ignored unknown UI action ${name}` };
  }

  switch (name) {
    case "navigate": {
      const href = String(input.href ?? "/");
      return navigate(href);
    }
    case "set_search": {
      const params = new URLSearchParams({
        from: String(input.from),
        to: String(input.to),
        date: String(input.date),
        quota: String(input.quota ?? "GN"),
      });
      return navigate(`/search?${params}`);
    }
    case "open_train": {
      const number = String(input.number);
      const date = input.date ? `?date=${input.date}` : "";
      return navigate(`/trains/${number}${date}`);
    }
    case "highlight":
    case "select_class":
    case "select_berth":
    case "set_passengers":
    case "set_contact":
    case "set_options":
    case "confirm":
      return agentStore.dispatchIntent(name, input);
    default: {
      const _never: never = name;
      return { ok: false, error: `Unhandled ${_never}` };
    }
  }
}

export function useAgentNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onNav = (event: Event) => {
      const href = (event as CustomEvent<{ href: string }>).detail?.href;
      if (href) router.push(href);
    };
    window.addEventListener("irctc:agent-navigate", onNav);
    return () => window.removeEventListener("irctc:agent-navigate", onNav);
  }, [router, pathname]);
}

export type { UiActionName, ClassCode };
