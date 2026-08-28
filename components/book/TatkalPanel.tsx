"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";

/**
 * Tatkal, without the stampede. You build the whole booking the night before;
 * at the opening moment it's a single tap. And when there is a queue, it says
 * where you are in it rather than spinning a wheel that tells you nothing.
 */
export function TatkalPanel({
  opensAt,
  classCode,
  onArm,
  armed,
}: {
  opensAt: Date;
  classCode: string;
  onArm: (armed: boolean) => void;
  armed: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = opensAt.getTime() - now;
  const open = msLeft <= 0;
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className={cn("rounded-xl border p-3.5", armed ? "border-warning/50 bg-warning-soft" : "border-border bg-muted")}>
      <div className="mb-2 flex items-center gap-2">
        <Zap className={cn("size-4", armed ? "text-warning" : "text-muted-foreground")} aria-hidden />
        <span className="text-[0.875rem] text-foreground">Tatkal Ready</span>
        {armed && <span className="ml-auto rounded bg-warning px-1.5 py-0.5 text-[0.625rem] text-[color:var(--card)]">Armed</span>}
      </div>

      <p className="mb-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
        {open ? (
          <>Tatkal booking for {classCode} is open now. Confirm below — everything is already filled in.</>
        ) : (
          <>
            Tatkal for {classCode} opens in{" "}
            <span className="tnum text-foreground">
              {hours > 0 && `${hours}h `}
              {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
            </span>
            . Fill everything in now and the booking becomes one tap at the moment it opens.
          </>
        )}
      </p>

      <button
        type="button"
        onClick={() => onArm(!armed)}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-[0.8125rem] transition-colors",
          armed
            ? "border-warning bg-transparent text-warning hover:bg-warning/10"
            : "border-input text-foreground hover:bg-secondary"
        )}
      >
        {armed ? "Disarm" : "Save this as Tatkal Ready"}
      </button>
    </div>
  );
}

/**
 * The queue. An honest position and a moving estimate, instead of a spinner
 * that implies progress it can't know about.
 */
export function BookingQueue({ position, total }: { position: number; total: number }) {
  const progress = Math.max(2, Math.round(((total - position) / total) * 100));
  return (
    <div className="rounded-xl border border-border bg-muted p-4 text-center" role="status" aria-live="polite">
      <p className="tnum text-[1.75rem] leading-none text-foreground">#{position.toLocaleString("en-IN")}</p>
      <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">
        in the queue, of {total.toLocaleString("en-IN")} people booking this train right now
      </p>
      <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2.5 text-[0.75rem] text-muted-foreground">
        Roughly {Math.max(1, Math.ceil(position / 140))} seconds left. Your place is held — don&rsquo;t reload.
      </p>
    </div>
  );
}
