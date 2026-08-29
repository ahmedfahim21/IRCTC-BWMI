import { cn } from "@/components/ui/cn";

/**
 * Origin, line, destination — the smallest possible drawing of a journey.
 * Sits between a pair of times wherever a route is summarised, so the same
 * glyph reads the same on a trip card, a ticket, and a train header.
 */
export function RouteGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-8 flex-1 items-center", className)} aria-hidden>
      <span className="size-[5px] shrink-0 rounded-full border border-brand" />
      <span className="h-px flex-1 bg-border-strong" />
      <span className="size-[5px] shrink-0 rounded-full bg-brand" />
    </span>
  );
}
