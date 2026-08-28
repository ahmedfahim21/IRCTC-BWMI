import { Suspense } from "react";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { SearchResults } from "./SearchResults";

export const metadata = { title: "Trains — IRCTC" };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><SkeletonRows rows={5} /></div>}>
      <SearchResults />
    </Suspense>
  );
}
