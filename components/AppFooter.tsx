"use client";

import Link from "next/link";
import { Logo } from "./ui/Logo";
import { Flourish, Mandala } from "./ui/Ornament";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * Every page ends somewhere on purpose. The footer carries the crest, the
 * honesty paragraph that used to live only on the home page — it belongs
 * under every screen, not one — and the three places people actually go next.
 */
export function AppFooter() {
  const { t } = useLocale();
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface pb-[3.75rem] sm:pb-0">
      <Mandala className="pointer-events-none absolute -bottom-24 -right-16 size-72 text-accent opacity-[0.07]" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Flourish className="mx-auto mb-8 block text-accent/60" />
        <div className="flex flex-wrap items-start justify-between gap-x-12 gap-y-8">
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-text">
              <Logo className="size-[22px] shrink-0" />
              <span className="flex items-baseline gap-1.5">
                <span className="text-[0.875rem] tracking-[-0.01em]">IRCTC</span>
                <span className="text-[0.5625rem] uppercase tracking-[0.1em] text-faint">redesign</span>
              </span>
            </div>
            <p className="mt-3 text-[0.75rem] leading-relaxed text-faint">{t("footer.disclaimer")}</p>
          </div>

          <nav aria-label={t("footer.navLabel")} className="flex gap-x-14 gap-y-2">
            <ul className="space-y-2 text-[0.8125rem]">
              <li><FooterLink href="/">{t("footer.findTrain")}</FooterLink></li>
              <li><FooterLink href="/map">{t("footer.liveMap")}</FooterLink></li>
            </ul>
            <ul className="space-y-2 text-[0.8125rem]">
              <li><FooterLink href="/pnr">{t("footer.checkPnr")}</FooterLink></li>
              <li><FooterLink href="/trips">{t("footer.myTrips")}</FooterLink></li>
            </ul>
          </nav>
        </div>

        <p className="mt-8 border-t border-border pt-5 text-[0.6875rem] leading-relaxed text-faint">
          {t("footer.sources")}
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-dim transition-colors hover:text-text">
      {children}
    </Link>
  );
}
