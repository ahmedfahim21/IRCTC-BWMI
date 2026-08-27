"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, Languages } from "lucide-react";
import { useLocale, LOCALES, type Locale } from "@/lib/i18n/useLocale";
import { cn } from "./cn";

/**
 * Language is a setting you can reach at any time — not a modal that blocks the
 * page on arrival before you've even said what you want.
 */
export function LanguageSetting() {
  const { locale, setLocale } = useLocale();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Language: ${LOCALES[locale].label}`}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-[0.6875rem] text-dim transition-colors hover:text-text"
        >
          <Languages className="size-3.5" aria-hidden />
          <span className="uppercase tracking-wider">{locale}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          collisionPadding={12}
          className="z-50 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]"
        >
          <p className="eyebrow px-2 pb-1.5 pt-1">Language</p>
          {(Object.keys(LOCALES) as Locale[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setLocale(key)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[0.8125rem] transition-colors",
                locale === key ? "bg-surface-2 text-text" : "text-dim hover:bg-surface-2"
              )}
            >
              <span>{LOCALES[key].label}</span>
              {locale === key && <Check className="size-3.5 text-brand" aria-hidden />}
            </button>
          ))}
          <p className="px-2 pb-1 pt-2 text-[0.6875rem] leading-relaxed text-faint">
            Changes apply immediately and are remembered on this device.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
