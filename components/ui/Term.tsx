"use client";

import * as Popover from "@radix-ui/react-popover";
import { lookup } from "@/lib/glossary";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "./cn";

/**
 * Railway jargon, always explained. Every WL / RAC / 3A / PQWL in the app goes
 * through here — a code the reader has to already know is a failure.
 *
 * Click rather than hover, so it works identically on a phone.
 */
export function Term({
  code,
  children,
  className,
}: {
  code: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { locale } = useLocale();
  const entry = lookup(code, locale);
  if (!entry) return <>{children ?? code}</>;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`What does ${code} mean? ${entry.short}`}
          className={cn(
            "cursor-help underline decoration-dotted decoration-from-font underline-offset-[3px]",
            "decoration-[color:var(--text-faint)] hover:decoration-[color:var(--brand)]",
            "transition-colors",
            className
          )}
        >
          {children ?? code}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          collisionPadding={12}
          className="z-50 max-w-[19rem] rounded-xl border border-border bg-surface p-3.5 text-sm shadow-[var(--shadow-lg)]"
        >
          <div className="mb-1 flex items-baseline gap-2">
            <span className="font-mono text-[0.8125rem] text-brand">{entry.term}</span>
            <span className="text-text">{entry.short}</span>
          </div>
          <p className="text-[0.8125rem] leading-relaxed text-dim">{entry.full}</p>
          <Popover.Arrow className="fill-[var(--border)]" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
