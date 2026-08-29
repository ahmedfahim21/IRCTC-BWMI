"use client";

import { useRef } from "react";
import { cn } from "@/components/ui/cn";
import type { ResizeEdge } from "./chatDock";

const HANDLES = [
  { edge: "n", className: "inset-x-3 top-0 h-2 cursor-ns-resize" },
  { edge: "s", className: "inset-x-3 bottom-0 h-2 cursor-ns-resize" },
  { edge: "e", className: "inset-y-3 right-0 w-2 cursor-ew-resize" },
  { edge: "w", className: "inset-y-3 left-0 w-2 cursor-ew-resize" },
  { edge: "ne", className: "right-0 top-0 size-3 cursor-nesw-resize" },
  { edge: "nw", className: "left-0 top-0 size-3 cursor-nwse-resize" },
  { edge: "se", className: "right-0 bottom-0 size-3 cursor-nwse-resize" },
  { edge: "sw", className: "left-0 bottom-0 size-3 cursor-nesw-resize" },
] as const satisfies ReadonlyArray<{ edge: ResizeEdge; className: string }>;

export function ChatResizeHandles({
  label,
  onResize,
  onResizeEnd,
}: {
  label: string;
  onResize: (edge: ResizeEdge, dx: number, dy: number) => void;
  onResizeEnd: () => void;
}) {
  const drag = useRef<{ edge: ResizeEdge; x: number; y: number } | null>(null);

  return (
    <>
      {HANDLES.map((handle) => (
        <button
          key={handle.edge}
          type="button"
          tabIndex={-1}
          aria-label={label}
          className={cn(
            "absolute z-10 touch-none rounded-full border-0 bg-transparent p-0 hover:bg-brand/25",
            handle.className
          )}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { edge: handle.edge, x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current) return;
            onResize(current.edge, event.clientX - current.x, event.clientY - current.y);
            current.x = event.clientX;
            current.y = event.clientY;
          }}
          onPointerUp={() => {
            drag.current = null;
            onResizeEnd();
          }}
        />
      ))}
    </>
  );
}