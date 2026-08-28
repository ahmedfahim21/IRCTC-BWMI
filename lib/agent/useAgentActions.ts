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
      const wantedType = typeof input.berthType === "string" ? input.berthType : "";
      const wantedNumber = Number(input.berth);
      const buttons = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Berth "]:not([disabled])')];
      const byType = wantedType
        ? buttons.find((el) => (el.getAttribute("aria-label") ?? "").includes(`, ${wantedType}`))
        : undefined;
      const byNumber = Number.isFinite(wantedNumber)
        ? buttons.find((el) => (el.getAttribute("aria-label") ?? "").startsWith(`Berth ${wantedNumber}`))
        : undefined;
      const target = byType ?? byNumber ?? buttons[0];
      if (target && target.getAttribute("aria-pressed") !== "true") target.click();
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
    case "set_options": {
      const switches: Array<{ key: string; label: string }> = [
        { key: "addMeals", label: "Add meals" },
        { key: "travelInsurance", label: "Travel insurance" },
        { key: "keepTogether", label: "Keep us in the same coach" },
        { key: "autoUpgrade", label: "Auto-upgrade" },
      ];
      const flipped: string[] = [];
      for (const { key, label } of switches) {
        if (typeof input[key] !== "boolean") continue;
        const wanted = Boolean(input[key]);
        const control = [...document.querySelectorAll<HTMLButtonElement>('button[role="switch"]')].find((el) =>
          (el.textContent ?? "").includes(label)
        );
        if (!control) continue;
        const checked = control.getAttribute("aria-checked") === "true";
        if (checked !== wanted) control.click();
        flipped.push(label);
      }
      return flipped.length ? `Updated ${flipped.join(", ")}` : "No matching options on screen";
    }
    case "confirm": {
      for (let attempt = 0; attempt < 10; attempt++) {
        const confirm = [...document.querySelectorAll("button")].find((el) =>
          /Confirm and pay/i.test(el.textContent ?? "")
        );
        if (confirm && !confirm.disabled) {
          confirm.click();
          return "Confirm clicked";
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return "Confirm not ready";
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
