"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CircleAlert, FileText, ShoppingBag, TriangleAlert, Undo2, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatRupees } from "@/components/availability/ClassCell";
import { TicketCard } from "@/components/trip/TicketCard";
import { LivePanel, Alarms } from "@/components/trip/LivePanel";
import { SchematicMap } from "@/components/rail/SchematicMap";
import { RailSpine } from "@/components/rail/RailSpine";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/components/ui/cn";

export function TripDetail({ pnr }: { pnr: string }) {
  const queryClient = useQueryClient();
  const [showRoute, setShowRoute] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["trip", pnr],
    queryFn: ({ signal }) => api.trip(pnr, signal),
    refetchInterval: 20_000,
    retry: false,
  });

  const { data: refund } = useQuery({
    queryKey: ["refundQuote", pnr],
    queryFn: ({ signal }) => api.refundQuote(pnr, signal),
    enabled: Boolean(data && data.booking.status !== "cancelled"),
  });

  const cancel = useMutation({
    mutationFn: () => api.cancel(pnr),
    onSuccess: () => {
      setConfirmingCancel(false);
      queryClient.invalidateQueries({ queryKey: ["trip", pnr] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  if (isPending) return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><SkeletonRows rows={3} /></div>;
  if (isError)
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );

  const { booking, train, live, stations, boardingStop, alightingStop, coachPosition } = data;
  const cancelled = booking.status === "cancelled";
  const waitlisted = booking.status === "waitlist" || booking.status === "partiallyConfirmed";

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-5 sm:px-6">
      <div className="mb-4 flex items-center gap-2 text-[0.8125rem] text-faint">
        <Link href="/trips" className="hover:text-dim">My trips</Link>
        <ChevronRight className="size-3" aria-hidden />
        <span className="tnum text-dim">{pnr}</span>
      </div>

      {cancelled && (
        <div className="card mb-4 flex items-start gap-2.5 border-border bg-surface-2 p-3.5">
          <Undo2 className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
          <div>
            <p className="text-[0.875rem] text-text">Ticket cancelled</p>
            <p className="mt-0.5 text-[0.8125rem] text-dim">
              {booking.refundAmount !== null ? (
                <>
                  <span className="tnum text-ok">{formatRupees(booking.refundAmount)}</span> is on its way back to your
                  original payment method. Refunds usually land within 5 to 7 working days.
                </>
              ) : (
                "Refund is being processed."
              )}
            </p>
          </div>
        </div>
      )}

      {waitlisted && !cancelled && (
        <div className="card mb-4 flex items-start gap-2.5 border-warn/30 bg-warn-soft p-3.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <div>
            <p className="text-[0.875rem] text-text">
              {booking.status === "partiallyConfirmed" ? "Some passengers are still waitlisted" : "Still on the waiting list"}
            </p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-dim">
              {booking.chartStatus === "prepared"
                ? "The chart is prepared. Waitlisted passengers on this ticket cannot travel and are refunded automatically."
                : "This resolves when the chart is prepared, about four hours before departure. We'll tell you either way — and if it doesn't clear, we'll have alternatives ready."}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {!cancelled && (
            <LivePanel
              live={live}
              stations={stations}
              boardingStop={boardingStop}
              alightingStop={alightingStop}
              boardingDelayMins={data.boardingDelayMins}
              arrivalDelayMins={data.arrivalDelayMins}
              coachPosition={coachPosition}
            />
          )}

          <SchematicMap
            schedule={train.schedule}
            stations={stations}
            live={cancelled ? null : live}
            highlightFrom={booking.fromCode}
            highlightTo={booking.toCode}
            className="aspect-[3/2] w-full sm:aspect-[16/7]"
            aspect={3 / 2}
          />

          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRoute((v) => !v)}
              aria-expanded={showRoute}
              className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <span className="text-[0.875rem] text-text">Full route</span>
              <span className="text-[0.75rem] text-faint">{train.schedule.length} stops</span>
              <ChevronRight className={cn("ml-auto size-4 text-faint transition-transform", showRoute && "rotate-90")} aria-hidden />
            </button>
            {showRoute && (
              <div className="min-w-0 overflow-hidden border-t border-border p-4">
                <RailSpine
                  schedule={train.schedule}
                  stations={stations}
                  dateIso={booking.journeyDate}
                  live={cancelled ? null : live}
                  highlightFrom={booking.fromCode}
                  highlightTo={booking.toCode}
                />
              </div>
            )}
          </div>

          {!cancelled && (
            <div className="card p-4">
              <h2 className="mb-3 text-[0.9375rem] text-text">On board</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                <Action icon={UtensilsCrossed} label="Order food to your seat" detail="Delivered by PNR at a station en route" />
                <Action icon={ShoppingBag} label="Coach attendant" detail="Bedding, cleaning, complaints" />
                <Action icon={CircleAlert} label="Report a problem" detail="Safety, security or cleanliness" />
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-3">
          <TicketCard
            booking={booking}
            stations={stations}
            boardingStop={boardingStop}
            alightingStop={alightingStop}
          />

          <div className={cn("card flex items-center gap-2.5 p-3.5", booking.chartStatus === "prepared" ? "border-info/30" : "")}>
            <FileText className={cn("size-4 shrink-0", booking.chartStatus === "prepared" ? "text-info" : "text-faint")} aria-hidden />
            <div>
              <p className="text-[0.8125rem] text-text">
                {booking.chartStatus === "prepared" ? "Chart prepared" : "Chart not prepared yet"}
              </p>
              <p className="text-[0.6875rem] leading-relaxed text-faint">
                {booking.chartStatus === "prepared"
                  ? "Berths are final. Any unclaimed berth is now the ticket examiner's to allot."
                  : "Berths are finalised about four hours before departure."}
              </p>
            </div>
          </div>

          {!cancelled && (
            <Alarms
              boardingName={stations[booking.fromCode]?.name ?? booking.fromCode}
              destinationName={stations[booking.toCode]?.name ?? booking.toCode}
              boardingMinute={booking.boardingMinute}
              arrivalMinute={booking.alightingMinute}
            />
          )}

          {!cancelled && refund && (
            <div className="card p-4">
              <h2 className="mb-2 text-[0.9375rem] text-text">Cancel this ticket</h2>
              <p className="mb-3 text-[0.8125rem] leading-relaxed text-dim">
                You&rsquo;d get <span className="tnum text-ok">{formatRupees(refund.quote.refundAmount)}</span> of{" "}
                <span className="tnum">{formatRupees(refund.quote.bookingTotal)}</span> back.
                <span className="mt-1 block text-[0.75rem] text-faint">{refund.quote.slab}.</span>
              </p>

              {confirmingCancel ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cancel.mutate()}
                    disabled={cancel.isPending}
                    className="flex-1 rounded-lg bg-danger px-3 py-2 text-[0.8125rem] text-[color:var(--surface)] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {cancel.isPending ? "Cancelling…" : "Yes, cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    className="rounded-lg border border-border px-3 py-2 text-[0.8125rem] text-dim transition-colors hover:border-border-strong"
                  >
                    Keep it
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-[0.8125rem] text-dim transition-colors hover:border-danger/40 hover:text-danger"
                >
                  Cancel ticket
                </button>
              )}

              {cancel.isError && (
                <p role="alert" className="mt-2 rounded-lg bg-danger-soft px-2.5 py-2 text-[0.75rem] text-danger">
                  {cancel.error instanceof Error ? cancel.error.message : "Could not cancel"}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Action({ icon: Icon, label, detail }: { icon: typeof UtensilsCrossed; label: string; detail: string }) {
  return (
    <button
      type="button"
      className="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface-2 p-3 text-left transition-colors hover:border-border-strong"
    >
      <Icon className="size-4 text-brand" aria-hidden />
      <span className="text-[0.8125rem] text-text">{label}</span>
      <span className="text-[0.6875rem] leading-relaxed text-faint">{detail}</span>
    </button>
  );
}
