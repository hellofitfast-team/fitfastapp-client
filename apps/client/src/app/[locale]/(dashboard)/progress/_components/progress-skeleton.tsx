"use client";

import { Skeleton } from "@fitfast/ui/skeleton";

export function ProgressSkeleton() {
  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Date range + tabs */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Stats overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-64 rounded-lg" />

      {/* Chart area */}
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
