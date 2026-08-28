"use client";

import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Tooltip trigger with required aria-label for audit compatibility. */
export function Tip({
  label,
  tip,
  children,
}: {
  label: string;
  tip?: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild aria-label={label}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{tip ?? label}</TooltipContent>
    </Tooltip>
  );
}
