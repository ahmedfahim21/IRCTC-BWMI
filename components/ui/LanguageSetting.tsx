"use client";

import { Check, Languages } from "lucide-react";
import { useLocale, LOCALES, type Locale } from "@/lib/i18n/useLocale";
import { cn } from "./cn";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/**
 * Language is a setting you can reach at any time — not a modal that blocks the
 * page on arrival before you've even said what you want.
 */
export function LanguageSetting() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-auto gap-1.5 border-border bg-muted px-2 py-1.5 text-[0.6875rem] text-muted-foreground"
          aria-label={`Language: ${LOCALES[locale].label}`}
        >
          <Languages className="size-3.5" aria-hidden />
          <span className="uppercase tracking-wider">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="eyebrow">Language</DropdownMenuLabel>
        {(Object.keys(LOCALES) as Locale[]).map((key) => (
          <DropdownMenuItem
            key={key}
            onClick={() => setLocale(key)}
            className={cn(locale === key && "bg-muted text-foreground")}
          >
            <span>{LOCALES[key].label}</span>
            {locale === key && <Check className="ml-auto size-3.5 text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
        <p className="px-2 pb-1 pt-2 text-[0.6875rem] leading-relaxed text-muted-foreground">
          Changes apply immediately and are remembered on this device.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
