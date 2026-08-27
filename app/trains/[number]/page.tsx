import { Suspense } from "react";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { TrainDetail } from "./TrainDetail";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Train ${number} — IRCTC` };
}

export default async function TrainPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><SkeletonRows rows={4} /></div>}>
      <TrainDetail number={number} />
    </Suspense>
  );
}
