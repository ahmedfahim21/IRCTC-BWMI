"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";
import { formatDateShort, formatWeekday } from "@/lib/domain/time";
import { DateStrip } from "./DateStrip";

export function DatePicker({
  date,
  from,
  to,
  onPick,
  disabled = false,
}: {
  date: string;
  from: string;
  to: string;
  onPick: (date: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${formatWeekday(date)} ${formatDateShort(date)}`}
          className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[0.875rem] text-text transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-45"
        >
          <CalendarDays className="size-4 text-faint" aria-hidden />
          <span className="whitespace-nowrap">
            {formatWeekday(date)} {formatDateShort(date)}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          collisionPadding={12}
          className="z-50 w-[min(36rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-lg)]"
        >
          <DateStrip
            from={from}
            to={to}
            date={date}
            onPick={(next) => {
              onPick(next);
              setOpen(false);
            }}
            disabled={disabled}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
