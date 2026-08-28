"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ArrowUpDown, CircleDot, MapPin, Search } from "lucide-react";
import { StationCombobox, type StationValue } from "./StationCombobox";
import { DateStrip } from "./DateStrip";
import { DatePicker } from "./DatePicker";
import { QuotaPicker } from "./QuotaPicker";
import type { QuotaCode } from "@/lib/types";
import { todayIso } from "@/lib/domain/time";
import { useLocale } from "@/lib/i18n/useLocale";
import { useAgentPublish } from "@/lib/agent/agentStore";

const LAST_KEY = "irctc.lastSearch";

export function SearchForm({
  compact = false,
  variant = "stacked",
  defaults,
}: {
  compact?: boolean;
  variant?: "stacked" | "bar";
  defaults?: {
    from: StationValue;
    to: StationValue;
    date: string;
    quota: QuotaCode;
  };
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [from, setFrom] = useState<StationValue | null>(defaults?.from ?? null);
  const [to, setTo] = useState<StationValue | null>(defaults?.to ?? null);
  const [date, setDate] = useState(defaults?.date ?? todayIso());
  const [quota, setQuota] = useState<QuotaCode>(defaults?.quota ?? "GN");

  const publish = useAgentPublish();

  useEffect(() => {
    if (defaults) {
      setFrom(defaults.from);
      setTo(defaults.to);
      setDate(defaults.date);
      setQuota(defaults.quota);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
      if (saved?.from) setFrom(saved.from);
      if (saved?.to) setTo(saved.to);
      if (saved?.quota) setQuota(saved.quota);
      if (saved?.date && saved.date >= todayIso()) setDate(saved.date);
    } catch {
      // A corrupt saved search is not worth failing over; the form still works empty.
    }
  }, [defaults]);

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

  if (variant === "bar") {
    return (
      <form onSubmit={submit} className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <StationCombobox
              compact
              label={t("search.from")}
              value={from}
              onChange={setFrom}
              placeholder="Delhi, NDLS…"
              icon={<CircleDot className="size-4" />}
            />
          </div>
          <button
            type="button"
            onClick={swap}
            aria-label={t("search.swap")}
            disabled={!from && !to}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-faint transition-colors hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUpDown className="size-3.5 lg:hidden" aria-hidden />
            <ArrowLeftRight className="hidden size-3.5 lg:block" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <StationCombobox
              compact
              label={t("search.to")}
              value={to}
              onChange={setTo}
              placeholder="Mumbai, BCT…"
              icon={<MapPin className="size-4" />}
            />
          </div>
        </div>
        <DatePicker
          date={date}
          from={from?.token ?? ""}
          to={to?.token ?? ""}
          disabled={!canSearch}
          onPick={(next) => {
            setDate(next);
            if (!from || !to || from.token === to.token) return;
            localStorage.setItem(LAST_KEY, JSON.stringify({ from, to, date: next, quota }));
            const params = new URLSearchParams({ from: from.token, to: to.token, date: next, quota });
            router.push(`/search?${params}`);
          }}
        />
        <QuotaPicker value={quota} onChange={setQuota} disabled={!canSearch} />
        <button
          type="submit"
          disabled={!canSearch}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[0.9375rem] text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search className="size-4" aria-hidden />
          {t("search.submit")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="card overflow-hidden p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="relative">
        <StationCombobox
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
          className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-faint shadow-[var(--shadow-sm)] transition-colors hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUpDown className="size-4" aria-hidden />
        </button>
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
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[1rem] text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
