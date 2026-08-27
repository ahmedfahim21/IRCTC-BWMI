"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isUiAction } from "./uiActions";
import type { ClassCode } from "@/lib/types";

export async function applyAgentTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (!isUiAction(name)) return `Ignored unknown UI action ${name}`;

  switch (name) {
    case "navigate": {
      window.dispatchEvent(new CustomEvent("irctc:agent-navigate", { detail: { href: String(input.href ?? "/") } }));
      return `Opened ${String(input.href)}`;
    }
    case "set_search": {
      const params = new URLSearchParams({
        from: String(input.from),
        to: String(input.to),
        date: String(input.date),
        quota: String(input.quota ?? "GN"),
      });
      window.dispatchEvent(new CustomEvent("irctc:agent-navigate", { detail: { href: `/search?${params}` } }));
      return "Search opened";
    }
    case "open_train": {
      const number = String(input.number);
      const date = input.date ? `?date=${input.date}` : "";
      window.dispatchEvent(new CustomEvent("irctc:agent-navigate", { detail: { href: `/trains/${number}${date}` } }));
      return `Opened train ${number}`;
    }
    case "select_class": {
      const button = document.querySelector<HTMLButtonElement>(`button[aria-label*="${String(input.classCode as ClassCode)}"]`);
      button?.click();
      return `Selected class ${String(input.classCode)}`;
    }
    case "select_berth": {
      const berth = document.querySelector<HTMLButtonElement>(
        `button[aria-label^="Berth ${Number(input.berth)}"]:not([disabled])`
      );
      (berth ?? document.querySelector<HTMLButtonElement>('button[aria-label^="Berth "]:not([disabled])'))?.click();
      return "Berth selected";
    }
    case "set_passengers": {
      const list = (input.passengers as Array<{ name: string }>) ?? [];
      const nameInput = document.querySelector<HTMLInputElement>('input[placeholder="As on your ID"]');
      if (nameInput && list[0]) {
        const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        native?.call(nameInput, list[0].name);
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return `Set ${list.length} passenger(s)`;
    }
    case "set_contact": {
      const phone = document.querySelector<HTMLInputElement>('input[placeholder="10 digits"]');
      if (phone) {
        const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        native?.call(phone, String(input.phone));
        phone.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return "Contact filled";
    }
    case "confirm": {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const confirm = [...document.querySelectorAll("button")].find((el) => /Confirm and pay/i.test(el.textContent ?? ""));
      confirm?.click();
      return "Confirm clicked";
    }
    case "highlight": {
      const trainNumber = String(input.trainNumber);
      const here = new URL(window.location.href);
      here.searchParams.set("train", trainNumber);
      window.dispatchEvent(
        new CustomEvent("irctc:agent-navigate", { detail: { href: `${here.pathname}?${here.searchParams}` } })
      );
      return `Highlighted ${trainNumber}`;
    }
    default: {
      const _never: never = name;
      return `Unhandled ${_never}`;
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
