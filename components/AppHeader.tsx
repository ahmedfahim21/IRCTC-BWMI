"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarSearch, Map, Ticket, TicketCheck } from "lucide-react";
import { Logo } from "./ui/Logo";
import { LanguageSetting } from "./ui/LanguageSetting";
import { DataSourceBadge } from "./ui/DataSourceBadge";
import { cn } from "./ui/cn";
import { useLocale } from "@/lib/i18n/useLocale";
import type { StringKey } from "@/lib/i18n/strings";

const NAV: Array<{ href: string; key: StringKey; icon: typeof Map }> = [
  { href: "/", key: "nav.book", icon: CalendarSearch },
  { href: "/map", key: "nav.map", icon: Map },
  { href: "/trips", key: "nav.trips", icon: TicketCheck },
  { href: "/pnr", key: "nav.pnr", icon: Ticket },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function AppHeader() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <header className="chrome sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-text" aria-label={t("nav.homeLabel")}>
          <Logo className="size-[26px] shrink-0" />
          <span className="flex items-baseline gap-1.5">
            <span className="text-[0.95rem] tracking-[-0.01em]">IRCTC</span>
            {/*
             * This uses IRCTC's own name and colours, so it says plainly and
             * permanently what it is. Never hidden at any breakpoint.
             */}
            <span className="text-[0.5625rem] uppercase tracking-[0.1em] text-faint">redesign</span>
          </span>
        </Link>

        {/* Desktop navigation. On mobile this lives in the bottom bar instead. */}
        <nav className="ml-1 hidden shrink-0 items-center gap-0.5 sm:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[0.8125rem] transition-colors",
                isActive(pathname, item.href) ? "bg-surface-2 text-text" : "text-faint hover:text-dim"
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <DataSourceBadge />
          <LanguageSetting />
        </div>
      </div>
    </header>
  );
}

/**
 * Bottom navigation on small screens. Four destinations don't fit alongside the
 * logo and settings in a 360 px header, and thumbs reach the bottom of a phone
 * far more easily than the top.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav
      aria-label="Main"
      className="chrome fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-brand" : "text-faint"
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                <span className="text-[0.625rem] leading-none">{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
