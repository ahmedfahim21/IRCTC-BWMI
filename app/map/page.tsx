import { Suspense } from "react";
import { LiveMap } from "./LiveMap";

export const metadata = {
  title: "Live train map — IRCTC",
  description: "Every train running across Indian Railways right now, on one map.",
};

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100dvh-3.5rem)] bg-muted" aria-hidden />}>
      <LiveMap />
    </Suspense>
  );
}
