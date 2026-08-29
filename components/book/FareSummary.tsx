"use client";

import type { FareBreakdown, RefundQuote } from "@/lib/types";
import { formatRupees } from "@/components/availability/ClassCell";
import { useLocale } from "@/lib/i18n/useLocale";
import type { StringKey } from "@/lib/i18n/strings";
import { cn } from "@/components/ui/cn";
import { Receipt } from "lucide-react";

const LINES: Array<{ key: keyof FareBreakdown; labelKey: StringKey; hintKey?: StringKey }> = [
  { key: "baseFare", labelKey: "book.baseFare" },
  { key: "reservationCharge", labelKey: "book.reservationCharge" },
  { key: "superfastCharge", labelKey: "book.superfastCharge" },
  { key: "dynamicSurge", labelKey: "book.dynamicSurge", hintKey: "book.dynamicSurgeHint" },
  { key: "cateringCharge", labelKey: "book.catering" },
  { key: "gst", labelKey: "book.gst", hintKey: "book.gstHint" },
  { key: "convenienceFee", labelKey: "book.convenienceFee", hintKey: "book.convenienceFeeHint" },
];

/** Every line, updating live as choices change. Nothing appears at the payment step. */
export function FareSummary({
  fare,
  passengerCount,
  className,
}: {
  fare: FareBreakdown;
  passengerCount: number;
  className?: string;
}) {
  const { t, locale } = useLocale();
  return (
    <dl className={cn("space-y-1.5", className)}>
      {LINES.map(({ key, labelKey, hintKey }) => {
        const value = fare[key];
        if (value === 0) return null;
        return (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] text-dim">
              {t(labelKey)}
              {hintKey && <span className="ml-1.5 text-[0.6875rem] text-faint">{t(hintKey)}</span>}
            </dt>
            <dd className="tnum shrink-0 text-[0.8125rem] text-text">{formatRupees(value)}</dd>
          </div>
        );
      })}
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
        <dt className="flex items-center gap-1.5 text-[0.875rem] text-text">
          <Receipt className="size-3.5 text-faint" aria-hidden />
          {t("book.total")}
          <span className="ml-1.5 text-[0.6875rem] text-faint">
            {passengerCount} {locale === "hi" ? "यात्री" : `passenger${passengerCount === 1 ? "" : "s"}`}
          </span>
        </dt>
        <dd className="tnum shrink-0 text-[1.0625rem] text-text">{formatRupees(fare.total)}</dd>
      </div>
    </dl>
  );
}

/**
 * What you get back if you change your mind — visible *before* paying. On IRCTC
 * this lives in a rules PDF you're expected to have already read.
 */
export function RefundPreview({ quote, className }: { quote: RefundQuote; className?: string }) {
  const { t, locale } = useLocale();
  const keptPercent = Math.round((quote.refundAmount / Math.max(1, quote.bookingTotal)) * 100);

  return (
    <div className={cn("rounded-xl border border-border bg-surface-2 p-3.5", className)}>
      <p className="eyebrow mb-2">{t("book.refundIfCancelled")}</p>

      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.875rem] text-text">{t("book.cancelRightNow")}</span>
        <span className="tnum text-[1.0625rem] text-ok">
          {formatRupees(quote.refundAmount)} {t("book.back")}
        </span>
      </div>

      <div
        className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={locale === "hi" ? `अभी ${keptPercent}% वापसी योग्य` : `${keptPercent}% refundable now`}
      >
        <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${keptPercent}%` }} />
      </div>

      <p className="text-[0.75rem] leading-relaxed text-dim">{quote.slab}.</p>

      {quote.nextSlabAt && quote.nextSlabRefund !== null && (
        <p className="mt-2 border-t border-border pt-2 text-[0.75rem] leading-relaxed text-warn">
          {locale === "hi" ? (
            <>
              <span className="text-text">{quote.nextSlabAt}</span> के बाद, यह घटकर{" "}
              <span className="tnum text-text">{formatRupees(quote.nextSlabRefund)}</span> रह जाएगा।
            </>
          ) : (
            <>
              After <span className="text-text">{quote.nextSlabAt}</span>, this drops to{" "}
              <span className="tnum text-text">{formatRupees(quote.nextSlabRefund)}</span>.
            </>
          )}
        </p>
      )}

      <p className="mt-2 text-[0.6875rem] leading-relaxed text-faint">
        {locale === "hi" ? (
          <>
            {t("book.cancellationCharge")} <span className="tnum">{formatRupees(quote.cancellationCharge)}</span>
            {quote.gstOnCharge > 0 && (
              <>
                {" "}
                और <span className="tnum">{formatRupees(quote.gstOnCharge)}</span> जीएसटी
              </>
            )}
            , <span className="tnum">{formatRupees(quote.bookingTotal)}</span> चुकाए गए में से।
          </>
        ) : (
          <>
            {t("book.cancellationCharge")} {formatRupees(quote.cancellationCharge)}
            {quote.gstOnCharge > 0 && (
              <>
                {" "}
                {t("book.plusGst")} {formatRupees(quote.gstOnCharge)} {t("book.gstShort")}
              </>
            )}{" "}
            {t("book.outOf")} {formatRupees(quote.bookingTotal)} {t("book.paid")}.
          </>
        )}
      </p>
    </div>
  );
}
