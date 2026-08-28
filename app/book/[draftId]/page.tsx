import { Suspense } from "react";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { BookingFlow } from "./BookingFlow";

export const metadata = { title: "Book — IRCTC" };

export default async function BookPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><SkeletonRows rows={4} /></div>}>
      <BookingFlow draftId={draftId} />
    </Suspense>
  );
}
