"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, CircleDot, MapPin, Search } from "lucide-react";
import { StationCombobox, type StationValue } from "./StationCombobox";
import { DateStrip } from "./DateStrip";
import { QuotaPicker } from "./QuotaPicker";
import type { QuotaCode } from "@/lib/types";
import { todayIso } from "@/lib/domain/time";
import { useLocale } from "@/lib/i18n/useLocale";

const LAST_KEY = "irctc.lastSearch";

export function SearchForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { t } = useLocale();
  const [from, setFrom] = useState<StationValue | null>(null);
  const [to, setTo] = useState<StationValue | null>(null);
  const [date, setDate] = useState(todayIso());
  const [quota, setQuota] = useState<QuotaCode>("GN");

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
    <form onSubmit={submit} className="card p-4 shadow-[var(--shadow-md)] sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:grid-rows-[auto_auto_auto] sm:items-end sm:gap-x-2 sm:gap-y-0">
        <StationCombobox
          column={1}
          label={t("search.from")}
          value={from}
          onChange={setFrom}
          placeholder="Delhi, NDLS…"
          icon={<CircleDot className="size-4" />}
        />
        <button
          type="button"
          onClick={swap}
          aria-label={t("search.swap")}
          disabled={!from && !to}
          className="flex size-10 shrink-0 items-center justify-center justify-self-center rounded-lg border border-border text-faint transition-colors hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-40 sm:col-start-2 sm:row-start-2 sm:justify-self-auto"
        >
          <ArrowLeftRight className="size-4" aria-hidden />
        </button>
        <StationCombobox
          column={3}
          label={t("search.to")}
          value={to}
          onChange={setTo}
          placeholder="Mumbai, BCT…"
          icon={<MapPin className="size-4" />}
        />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="eyebrow">{t("search.date")}</span>
          <QuotaPicker value={quota} onChange={setQuota} disabled={!canSearch} />
        </div>
        <DateStrip
          from={from?.token ?? ""}
          to={to?.token ?? ""}
          date={date}
          onPick={setDate}
          disabled={!canSearch}
        />
      </div>

      <button
        type="submit"
        disabled={!canSearch}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[0.9375rem] text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Search className="size-4" aria-hidden />
        {t("search.submit")}
      </button>

      {!compact && (
        <p className="mt-2.5 min-h-[1.125rem] text-center text-[0.75rem] text-faint">
          {from && to && from.token === to.token ? "Pick two different stations" : t("home.noLogin")}
        </p>
      )}
    </form>
  );
}
