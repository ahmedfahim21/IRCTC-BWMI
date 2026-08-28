"use client";

import type { ReactNode } from "react";
import { SlippyRasterMap } from "./SlippyRasterMap";

/**
 * The map is a 2D canvas of Esri street tiles, with OSM as a fallback.
 */
export function RailMap({
  className,
  children,
  onMoveEnd,
  interactive = true,
}: {
  className?: string;
  children?: ReactNode;
  onMoveEnd?: (bbox: string) => void;
  interactive?: boolean;
}) {
  return (
    <SlippyRasterMap className={className} onMoveEnd={onMoveEnd} interactive={interactive}>
      {children}
    </SlippyRasterMap>
  );
}
