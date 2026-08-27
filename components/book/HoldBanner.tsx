"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, TimerReset } from "lucide-react";
import { cn } from "@/components/ui/cn";

/**
 * The hold, always visible. IRCTC times you out silently and drops everything;
 * here the clock is on screen and nothing is lost when it runs down — the draft
 * is saved server-side and reloading brings you straight back to it.
 */
export function HoldBanner({ holdExpiresAt, saving }: { holdExpiresAt: string; saving: boolean }) {
  const [remaining, setRemaining] = useState(() => Date.parse(holdExpiresAt) - Date.now());

  useEffect(() => {
    setRemaining(Date.parse(holdExpiresAt) - Date.now());
    const id = setInterval(() => setRemaining(Date.parse(holdExpiresAt) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  const seconds = Math.max(0, Math.floor(remaining / 1000));
  const expired = seconds === 0;
  const low = seconds < 120;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-3.5 py-2.5",
        expired ? "border-border bg-surface-2" : low ? "border-warn/40 bg-warn-soft" : "border-border bg-surface-2"
      )}
    >
      <span className={cn("flex items-center gap-1.5 text-[0.8125rem]", low && !expired ? "text-warn" : "text-dim")}>
        <TimerReset className="size-3.5" aria-hidden />
        {expired ? (
          "Seat hold expired"
        ) : (
          <>
            Seats held for{" "}
            <span className="tnum text-text">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </>
        )}
      </span>

      <span className="flex items-center gap-1.5 text-[0.75rem] text-faint">
        <ShieldCheck className="size-3.5 text-ok" aria-hidden />
        {saving ? "Saving…" : "Saved — you can close this and come back"}
      </span>

      {expired && (
        <span className="text-[0.75rem] text-dim">
          Your details are still here. Availability will be re-checked when you confirm.
        </span>
      )}
    </div>
  );
}
