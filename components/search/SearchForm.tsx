"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, CalendarDays, CircleDot, MapPin, Search } from "lucide-react";
import { StationCombobox, type StationValue } from "./StationCombobox";
import { DateStrip } from "./DateStrip";
import { QuotaPicker } from "./QuotaPicker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { QuotaCode } from "@/lib/types";
import { todayIso } from "@/lib/domain/time";
import { useLocale } from "@/lib/i18n/useLocale";
import { agentStore, useAgentIntentDrain, useAgentPublish } from "@/lib/agent/agentStore";

const LAST_KEY = "irctc.lastSearch";

export function SearchForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { t } = useLocale();
  const [from, setFrom] = useState<StationValue | null>(null);
  const [to, setTo] = useState<StationValue | null>(null);
  const [date, setDate] = useState(todayIso());
  const [quota, setQuota] = useState<QuotaCode>("GN");

  const publish = useAgentPublish();

  // Come back to a search you already started rather than an empty form.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
      if (saved?.from) setFrom(saved.from);
      if (saved?.to) setTo(saved.to);
      if (saved?.quota) setQuota(saved.quota);
      if (saved?.date && saved.date >= todayIso()) setDate(saved.date);
    } catch {
      // A corrupt saved search is not worth failing over; the form still works empty.
    }
  }, []);

  useEffect(() => {
    publish.current({
      search:
        from && to
          ? { from: from.token, to: to.token, date, quota }
          : null,
    });
  }, [from, to, date, quota, publish]);

  const canSearch = Boolean(from && to && from.token !== to.token);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSearch) return;
    localStorage.setItem(LAST_KEY, JSON.stringify({ from, to, date, quota }));
    const params = new URLSearchParams({ from: from!.token, to: to!.token, date, quota });
    router.push(`/search?${params}`);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-5 shadow-[var(--shadow-md)] sm:p-6">
      <div className="relative">
        <StationCombobox
          label={t("search.from")}
          value={from}
          onChange={setFrom}
          placeholder="Delhi, NDLS…"
          icon={<CircleDot className="size-4" />}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={swap}
          aria-label={t("search.swap")}
          disabled={!from && !to}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full shadow-[var(--shadow-sm)]"
        >
          <ArrowUpDown className="size-4" aria-hidden />
        </Button>
        <StationCombobox
          label={t("search.to")}
          value={to}
          onChange={setTo}
          placeholder="Mumbai, BCT…"
          icon={<MapPin className="size-4" />}
        />
      </div>

      <div className="mt-6">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <span className="eyebrow">{t("search.date")}</span>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" aria-label="Pick date from calendar" className="gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Calendar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={new Date(`${date}T12:00:00`)}
                  onSelect={(picked) => picked && setDate(picked.toISOString().slice(0, 10))}
                  disabled={(picked) => picked.toISOString().slice(0, 10) < todayIso()}
                />
              </PopoverContent>
            </Popover>
            <QuotaPicker value={quota} onChange={setQuota} disabled={!canSearch} />
          </div>
        </div>
        <DateStrip
          from={from?.token ?? ""}
          to={to?.token ?? ""}
          date={date}
          onPick={setDate}
          disabled={!canSearch}
        />
      </div>

      <Button type="submit" disabled={!canSearch} className="mt-6 h-14 w-full gap-2 rounded-xl text-[1rem] hover:opacity-90">
        <Search className="size-4" aria-hidden />
        {t("search.submit")}
      </Button>

      {!compact && (
        <p className="mt-2.5 min-h-[1.125rem] text-center text-[0.75rem] text-muted-foreground">
          {from && to && from.token === to.token ? "Pick two different stations" : t("home.noLogin")}
        </p>
      )}
    </form>
  );
}
