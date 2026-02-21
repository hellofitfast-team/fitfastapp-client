"use client";

import { Skeleton } from "@fitfast/ui/skeleton";

export function TrackingSkeleton() {
  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>

      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
