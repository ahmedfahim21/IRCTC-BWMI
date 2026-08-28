"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/components/ui/cn";

const MAP_OPEN_KEY = "irctc.mapOpen";

function readMapOpen(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(MAP_OPEN_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return window.matchMedia("(min-width: 1024px)").matches;
}

/**
 * Framed, collapsible map shell shared by landing and search. The map subtree
 * unmounts when closed so SlippyRasterMap does not spin on a zero-size canvas.
 */
export function MapCanvasCard({
  label,
  expandLabel = "Expand map",
  collapseLabel = "Collapse map",
  children,
  className,
  bodyClassName,
  onOpenChange,
}: {
  label: string;
  expandLabel?: string;
  collapseLabel?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readMapOpen();
    setOpen(stored);
    setHydrated(true);
    onOpenChange?.(stored);
  }, [onOpenChange]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    localStorage.setItem(MAP_OPEN_KEY, String(next));
    onOpenChange?.(next);
  };

  const toggleLabel = open ? collapseLabel : expandLabel;

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} className={cn("card overflow-hidden shadow-[var(--shadow-sm)]", className)}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-[0.8125rem] text-dim transition-colors hover:text-text">
        <span>{label}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
        <span className="sr-only">{toggleLabel}</span>
      </CollapsibleTrigger>
      {hydrated && open ? (
        <div className={cn("relative overflow-hidden transition-[height] duration-200 ease-out", bodyClassName)}>{children}</div>
      ) : null}
    </Collapsible>
  );
}
