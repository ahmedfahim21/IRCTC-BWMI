"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CircleAlert, FileText, ShoppingBag, TriangleAlert, Undo2, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatRupees } from "@/components/availability/ClassCell";
import { TicketCard } from "@/components/trip/TicketCard";
import { LivePanel, Alarms } from "@/components/trip/LivePanel";
import { TrainHeroMap } from "@/components/map/TrainHeroMap";
import { RailSpine } from "@/components/rail/RailSpine";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/components/ui/cn";

export function TripDetail({ pnr }: { pnr: string }) {
  const queryClient = useQueryClient();
  const [showRoute, setShowRoute] = useState(false);

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
      <div className="mb-4 flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
        <Link href="/trips" className="hover:text-muted-foreground">My trips</Link>
        <ChevronRight className="size-3" aria-hidden />
        <span className="tnum text-muted-foreground">{pnr}</span>
      </div>

      {cancelled && (
        <div className="rounded-xl border bg-card mb-4 flex items-start gap-2.5 border-border bg-muted p-3.5">
          <Undo2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-[0.875rem] text-foreground">Ticket cancelled</p>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              {booking.refundAmount !== null ? (
                <>
                  <span className="tnum text-success">{formatRupees(booking.refundAmount)}</span> is on its way back to your
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
        <div className="rounded-xl border bg-card mb-4 flex items-start gap-2.5 border-warning/30 bg-warning-soft p-3.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="text-[0.875rem] text-foreground">
              {booking.status === "partiallyConfirmed" ? "Some passengers are still waitlisted" : "Still on the waiting list"}
            </p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
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

          <TrainHeroMap
            trainNumber={train.number}
            schedule={train.schedule}
            stations={stations}
            live={cancelled ? null : live}
            highlightFrom={booking.fromCode}
            highlightTo={booking.toCode}
            className="aspect-[3/2] w-full sm:aspect-[16/7]"
          />

          <Collapsible open={showRoute} onOpenChange={setShowRoute}>
            <Card className="gap-0 overflow-hidden py-0 shadow-none">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex h-auto w-full items-center gap-2 rounded-none px-4 py-3 text-left hover:bg-muted"
                >
                  <span className="text-[0.875rem] text-foreground">Full route</span>
                  <span className="text-[0.75rem] text-muted-foreground">{train.schedule.length} stops</span>
                  <ChevronRight className={cn("ml-auto size-4 text-muted-foreground transition-transform", showRoute && "rotate-90")} aria-hidden />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Separator />
                <CardContent className="min-w-0 overflow-hidden p-4">
                  <RailSpine
                    schedule={train.schedule}
                    stations={stations}
                    dateIso={booking.journeyDate}
                    live={cancelled ? null : live}
                    highlightFrom={booking.fromCode}
                    highlightTo={booking.toCode}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {!cancelled && (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 text-[0.9375rem] text-foreground">On board</h2>
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

          <div className={cn("rounded-xl border bg-card flex items-center gap-2.5 p-3.5", booking.chartStatus === "prepared" ? "border-info/30" : "")}>
            <FileText className={cn("size-4 shrink-0", booking.chartStatus === "prepared" ? "text-info" : "text-muted-foreground")} aria-hidden />
            <div>
              <p className="text-[0.8125rem] text-foreground">
                {booking.chartStatus === "prepared" ? "Chart prepared" : "Chart not prepared yet"}
              </p>
              <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
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
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-2 text-[0.9375rem] text-foreground">Cancel this ticket</h2>
              <p className="mb-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                You&rsquo;d get <span className="tnum text-success">{formatRupees(refund.quote.refundAmount)}</span> of{" "}
                <span className="tnum">{formatRupees(refund.quote.bookingTotal)}</span> back.
                <span className="mt-1 block text-[0.75rem] text-muted-foreground">{refund.quote.slab}.</span>
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-lg text-[0.8125rem] text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                  >
                    Cancel ticket
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this ticket?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You&rsquo;d get <span className="tnum text-success">{formatRupees(refund.quote.refundAmount)}</span> of{" "}
                      <span className="tnum">{formatRupees(refund.quote.bookingTotal)}</span> back. {refund.quote.slab}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate()}
                    >
                      {cancel.isPending ? "Cancelling…" : "Yes, cancel"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {cancel.isError && (
                <p role="alert" className="mt-2 rounded-lg bg-destructive-soft px-2.5 py-2 text-[0.75rem] text-destructive">
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
      className="flex flex-col items-start gap-1 rounded-lg border border-border bg-muted p-3 text-left transition-colors hover:border-input"
    >
      <Icon className="size-4 text-primary" aria-hidden />
      <span className="text-[0.8125rem] text-foreground">{label}</span>
      <span className="text-[0.6875rem] leading-relaxed text-muted-foreground">{detail}</span>
    </button>
  );
}
