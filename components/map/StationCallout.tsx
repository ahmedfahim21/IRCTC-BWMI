"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { formatMinute } from "@/lib/domain/time";
import type { StationPin } from "@/components/map/StationPins";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/components/ui/cn";

export function StationCallout({
  pin,
  arrivalMinute,
  departureMinute,
  searchFromHref,
  onClose,
  className,
}: {
  pin: StationPin;
  arrivalMinute?: number | null;
  departureMinute?: number | null;
  /** When set, overrides the default home-page link for "Search from here". */
  searchFromHref?: string;
  onClose: () => void;
  className?: string;
}) {
  const { t } = useLocale();
  const hasArrival = arrivalMinute !== undefined && arrivalMinute !== null;
  const hasDeparture = departureMinute !== undefined && departureMinute !== null;

  return (
    <div
      className={cn(
        "absolute inset-x-2 bottom-2 z-20 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-lg)]",
        className
      )}
      role="dialog"
      aria-label={`${pin.name} (${pin.code})`}
    >
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] text-text">{pin.name}</p>
          <p className="tnum text-[0.75rem] text-faint">{pin.code}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="shrink-0 rounded-md p-1 text-faint transition-colors hover:text-text"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {(hasArrival || hasDeparture) && (
        <dl className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.75rem]">
          {hasArrival && (
            <>
              <dt className="text-faint">{t("map.arrival")}</dt>
              <dd className="tnum text-text">{formatMinute(arrivalMinute)}</dd>
            </>
          )}
          {hasDeparture && (
            <>
              <dt className="text-faint">{t("map.departure")}</dt>
              <dd className="tnum text-text">{formatMinute(departureMinute)}</dd>
            </>
          )}
        </dl>
      )}

      <Link
        href={searchFromHref ?? `/?from=${encodeURIComponent(pin.code)}`}
        className="flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-[0.8125rem] text-dim hover:text-text"
      >
        {t("map.searchFromHere")}
      </Link>
    </div>
  );
}
