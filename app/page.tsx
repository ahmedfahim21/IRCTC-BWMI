"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchForm } from "@/components/search/SearchForm";
import { NextTripCard } from "@/components/trip/NextTripCard";
import { LandingMap } from "@/components/map/LandingMap";
import { useLocale } from "@/lib/i18n/useLocale";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/components/ui/cn";

/**
 * Map-first booking: the search is the first thing a thumb reaches; the live
 * network sits beside it on a wide screen and folds away on a phone.
 */
export default function HomePage() {
  const { t } = useLocale();
  const [mapOpen, setMapOpen] = useState(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(24rem,38rem)_1fr]">
      <ScrollArea className="flex min-h-0 flex-col lg:overflow-y-auto">
      <div className="px-4 pb-8 pt-6 sm:px-6 lg:pt-10">
        <header className="mb-6">
          <p className="eyebrow mb-2">Indian Railways</p>
          <h1 className="text-balance text-[1.625rem] leading-tight tracking-[-0.02em] text-foreground sm:text-[1.875rem]">
            {t("home.heading")}
          </h1>
          <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">{t("home.sub")}</p>
        </header>

        <SearchForm />

        <div className="mt-5">
          <NextTripCard />
        </div>

        <p className="mt-8 text-[0.6875rem] leading-relaxed text-muted-foreground">
          An independent redesign concept. This is not the official IRCTC service, is not affiliated
          with IRCTC or Indian Railways, and cannot issue a real ticket — payment is simulated and no
          reservation is made. Live timetables, running positions and station data come from the
          RailRadar API; seat availability, fares and confirmation odds are modelled.{" "}
          <Link href="/pnr" className="underline decoration-dotted underline-offset-2 hover:text-muted-foreground">
            Look up a PNR
          </Link>{" "}
          or{" "}
          <Link href="/trips" className="underline decoration-dotted underline-offset-2 hover:text-muted-foreground">
            see the demo trips
          </Link>
          .
        </p>
      </div>
      </ScrollArea>

      <Collapsible open={isWide || mapOpen} onOpenChange={setMapOpen} className="lg:min-h-0">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex h-auto w-full items-center justify-between rounded-none border-y border-border px-4 py-2.5 text-[0.8125rem] text-muted-foreground lg:hidden"
          >
            {mapOpen ? t("home.mapCollapse") : t("home.mapExpand")}
            <ChevronDown className={cn("size-4 transition-transform", mapOpen && "rotate-180")} aria-hidden />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="lg:block">
          <div className={cn("relative bg-muted", mapOpen || isWide ? (isWide ? "lg:h-full" : "h-[40vh]") : "h-28", "lg:h-full lg:min-h-0")}>
            <LandingMap />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
