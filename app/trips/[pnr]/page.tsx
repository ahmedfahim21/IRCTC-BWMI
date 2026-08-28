import { Suspense } from "react";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { TripDetail } from "./TripDetail";

export async function generateMetadata({ params }: { params: Promise<{ pnr: string }> }) {
  const { pnr } = await params;
  return { title: `PNR ${pnr} — IRCTC` };
}

export default async function TripPage({ params }: { params: Promise<{ pnr: string }> }) {
  const { pnr } = await params;
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><SkeletonRows rows={3} /></div>}>
      <TripDetail pnr={pnr} />
    </Suspense>
  );
}
