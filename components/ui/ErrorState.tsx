"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

/**
 * A visible failure. Nothing in this app falls back to placeholder data to keep
 * a screen looking alive — if a request broke, the screen says so.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <Alert variant="destructive" className="border-destructive/30 bg-destructive-soft">
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>Couldn&rsquo;t load this</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RotateCw className="size-3.5" aria-hidden />
          Try again
        </Button>
      )}
    </Alert>
  );
}
