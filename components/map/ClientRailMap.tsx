"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const Loaded = dynamic(() => import("./RailMap").then((mod) => mod.RailMap), {
  ssr: false,
  loading: () => <div className="size-full min-h-[12rem] bg-surface-2" aria-hidden />,
});

/** Client-only map mount. Safe to call from other client components. */
export function ClientRailMap(props: ComponentProps<typeof Loaded>) {
  return <Loaded {...props} />;
}
