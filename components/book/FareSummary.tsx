"use client";

import type { FareBreakdown, RefundQuote } from "@/lib/types";
import { formatRupees } from "@/components/availability/ClassCell";
import { cn } from "@/components/ui/cn";
import { Receipt } from "lucide-react";

const LINES: Array<{ key: keyof FareBreakdown; label: string; hint?: string }> = [
  { key: "baseFare", label: "Base fare" },
  { key: "reservationCharge", label: "Reservation charge" },
  { key: "superfastCharge", label: "Superfast charge" },
  { key: "dynamicSurge", label: "Flexi / Tatkal premium", hint: "Rises with how full the train is" },
  { key: "cateringCharge", label: "Catering" },
  { key: "gst", label: "GST", hint: "5%, air-conditioned classes only" },
  { key: "convenienceFee", label: "Convenience fee", hint: "Once per ticket" },
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
  return (
    <dl className={cn("space-y-1.5", className)}>
      {LINES.map(({ key, label, hint }) => {
        const value = fare[key];
        if (value === 0) return null;
        return (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] text-dim">
              {label}
              {hint && <span className="ml-1.5 text-[0.6875rem] text-faint">{hint}</span>}
            </dt>
            <dd className="tnum shrink-0 text-[0.8125rem] text-text">{formatRupees(value)}</dd>
          </div>
        );
      })}
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
        <dt className="flex items-center gap-1.5 text-[0.875rem] text-text">
          <Receipt className="size-3.5 text-faint" aria-hidden />
          Total
          <span className="ml-1.5 text-[0.6875rem] text-faint">
            {passengerCount} passenger{passengerCount === 1 ? "" : "s"}
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
  const keptPercent = Math.round((quote.refundAmount / Math.max(1, quote.bookingTotal)) * 100);

  return (
    <div className={cn("rounded-xl border border-border bg-surface-2 p-3.5", className)}>
      <p className="eyebrow mb-2">If you cancel</p>

      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.875rem] text-text">Cancel right now</span>
        <span className="tnum text-[1.0625rem] text-ok">{formatRupees(quote.refundAmount)} back</span>
      </div>

      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${keptPercent}% refundable now`}>
        <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${keptPercent}%` }} />
      </div>

      <p className="text-[0.75rem] leading-relaxed text-dim">{quote.slab}.</p>

      {quote.nextSlabAt && quote.nextSlabRefund !== null && (
        <p className="mt-2 border-t border-border pt-2 text-[0.75rem] leading-relaxed text-warn">
          After <span className="text-text">{quote.nextSlabAt}</span>, this drops to{" "}
          <span className="tnum text-text">{formatRupees(quote.nextSlabRefund)}</span>.
        </p>
      )}

      <p className="mt-2 text-[0.6875rem] leading-relaxed text-faint">
        Cancellation charge {formatRupees(quote.cancellationCharge)}
        {quote.gstOnCharge > 0 && <> plus {formatRupees(quote.gstOnCharge)} GST</>} out of{" "}
        {formatRupees(quote.bookingTotal)} paid.
      </p>
    </div>
  );
}
