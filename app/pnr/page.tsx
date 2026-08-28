"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Ticket } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatDateShort } from "@/lib/domain/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

/** PNR lookup with no login. Checking a ticket should never need an account. */
export default function PnrLookupPage() {
  const router = useRouter();
  const [pnr, setPnr] = useState("");
  const { data } = useQuery({ queryKey: ["bookings"], queryFn: ({ signal }) => api.bookings(signal) });

  const valid = /^\d{10}$/.test(pnr.trim());

  return (
    <div className="mx-auto max-w-lg px-4 pb-20 pt-12 sm:px-6">
      <h1 className="mb-1.5 text-[1.375rem] tracking-[-0.01em]">Check a PNR</h1>
      <p className="mb-6 text-[0.875rem] leading-relaxed text-muted-foreground">
        Ten digits from your ticket. No sign-in, no CAPTCHA.
      </p>

      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="p-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) router.push(`/trips/${pnr.trim()}`);
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={pnr}
          onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="1234567890"
          aria-label="PNR number"
          className="tnum h-11 min-w-0 flex-1 border-0 bg-transparent px-2.5 text-[1.0625rem] tracking-[0.12em] shadow-none focus-visible:ring-0 placeholder:tracking-normal"
        />
        <Button type="submit" disabled={!valid} className="h-11 shrink-0 gap-1.5 rounded-lg px-4 text-[0.875rem] hover:opacity-90">
          <Search className="size-4" aria-hidden />
          Check
        </Button>
      </form>
        </CardContent>
      </Card>

      {data && data.bookings.length > 0 && (
        <div className="mt-8">
          <h2 className="eyebrow mb-2.5">Or try one of these</h2>
          <ul className="space-y-1.5">
            {data.bookings.map((booking) => (
              <li key={booking.pnr}>
                <Link
                  href={`/trips/${booking.pnr}`}
                  className="rounded-xl border bg-card flex items-center gap-3 p-3 transition-colors hover:border-input"
                >
                  <Ticket className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="tnum block text-[0.875rem] tracking-[0.06em] text-foreground">{booking.pnr}</span>
                    <span className="block truncate text-[0.75rem] text-muted-foreground">
                      {booking.trainNumber} · {data.stations[booking.fromCode]?.name} →{" "}
                      {data.stations[booking.toCode]?.name} · {formatDateShort(booking.journeyDate)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
