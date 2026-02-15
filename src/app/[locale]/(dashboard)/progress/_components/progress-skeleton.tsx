"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ProgressSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-0">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-16 -ms-1 first:ms-0" />
            ))}
          </div>
        </div>
      </div>

      {/* Stats overview skeleton */}
      <div className="grid gap-0 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`border-4 border-black -ms-0 md:-ms-1 first:ms-0 -mt-1 md:-mt-0 first:mt-0 ${i === 3 ? 'bg-primary' : 'bg-cream'} p-5`}>
            <Skeleton className={`h-4 w-20 mb-2 ${i === 3 ? 'bg-white/20' : ''}`} />
            <Skeleton className={`h-10 w-16 mb-1 ${i === 3 ? 'bg-white/20' : ''}`} />
            <Skeleton className={`h-3 w-24 ${i === 3 ? 'bg-white/20' : ''}`} />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-0">
        <Skeleton className="flex-1 h-14" />
      </div>

      {/* Chart area skeleton */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-6">
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    </div>
  );
}
