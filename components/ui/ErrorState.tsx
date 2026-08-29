"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * A visible failure. Nothing in this app falls back to placeholder data to keep
 * a screen looking alive — if a request broke, the screen says so.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useLocale();
  const message = error instanceof Error ? error.message : t("common.somethingWrong");
  return (
    <div className="card flex flex-col items-start gap-3 border-danger/30 bg-danger-soft p-5" role="alert">
      <div className="flex items-center gap-2 text-danger">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <span className="text-sm">{t("common.couldNotLoad")}</span>
      </div>
      <p className="text-[0.8125rem] leading-relaxed text-dim">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary px-3.5 py-1.5 text-[0.8125rem]"
        >
          <RotateCw className="size-3.5" aria-hidden />
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
