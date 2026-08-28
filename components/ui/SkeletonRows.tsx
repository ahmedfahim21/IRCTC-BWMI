import { cn } from "./cn";
import { Skeleton } from "./skeleton";

/** Loading states over sudden content pops. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-56" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
