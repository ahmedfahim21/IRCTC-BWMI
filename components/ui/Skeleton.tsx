"use client";

import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "./cn";

/** Loading states over sudden content pops. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  const { t } = useLocale();
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label={t("common.loading")}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-56" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}
