import { Skeleton } from "@fitfast/ui/skeleton";

export default function CheckInLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-8">
      {/* Header skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Step progress skeleton */}
      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-10 rounded-full" />
        ))}
      </div>

      {/* Form card skeleton */}
      <Skeleton className="h-80 rounded-xl" />

      {/* Navigation buttons skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-lg" />
        <Skeleton className="h-12 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
