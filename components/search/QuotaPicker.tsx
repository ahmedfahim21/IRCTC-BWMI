"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import type { QuotaCode } from "@/lib/types";
import { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/components/ui/cn";

const QUOTAS: QuotaCode[] = ["GN", "TQ", "PT", "LD", "SS"];

/** Quota, with each option explained inline instead of assumed knowledge. */
export function QuotaPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: QuotaCode;
  onChange: (q: QuotaCode) => void;
  disabled?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-disabled={disabled}
          className="field flex items-center gap-1.5 rounded-lg px-3 py-2 text-[0.8125rem] text-dim hover:text-text disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="text-faint">Quota</span>
          <span className="text-text">{GLOSSARY[value].short}</span>
          <ChevronDown className="size-3 text-faint" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="end"
          collisionPadding={12}
          className="z-50 w-72 rounded-xl border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]"
        >
          {QUOTAS.map((quota) => {
            const entry = GLOSSARY[quota];
            return (
              <button
                key={quota}
                type="button"
                onClick={() => onChange(quota)}
                className={cn(
                  "flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  value === quota ? "bg-surface-2" : "hover:bg-surface-2"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[0.6875rem] text-brand">{quota}</span>
                    <span className="text-[0.8125rem] text-text">{entry.short}</span>
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] leading-relaxed text-faint">{entry.full}</span>
                </span>
                {value === quota && <Check className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
