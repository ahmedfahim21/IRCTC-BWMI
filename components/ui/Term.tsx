"use client";

import { lookup } from "@/lib/glossary";
import { cn } from "./cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

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
  const entry = lookup(code);
  if (!entry) return <>{children ?? code}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What does ${code} mean? ${entry.short}`}
          className={cn(
            "cursor-help underline decoration-dotted decoration-from-font underline-offset-[3px]",
            "decoration-muted-foreground hover:decoration-primary",
            "transition-colors",
            className
          )}
        >
          {children ?? code}
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[19rem] w-auto border-border shadow-[var(--shadow-lg)]">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="font-mono text-[0.8125rem] text-primary">{entry.term}</span>
          <span className="text-foreground">{entry.short}</span>
        </div>
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{entry.full}</p>
      </PopoverContent>
    </Popover>
  );
}
