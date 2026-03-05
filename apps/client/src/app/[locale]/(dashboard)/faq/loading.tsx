import { Skeleton } from "@fitfast/ui/skeleton";

export default function FaqLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      {/* Header skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Search bar skeleton */}
      <Skeleton className="h-11 w-full rounded-lg" />

      {/* FAQ items skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
