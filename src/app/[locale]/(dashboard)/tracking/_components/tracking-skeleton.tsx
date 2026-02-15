"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";

export function TrackingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 bg-primary/30" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-32 bg-neutral-700" />
            <Skeleton className="h-3 w-24 bg-neutral-700" />
          </div>
        </div>
      </div>

      {/* Date picker & progress skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="border-4 border-black bg-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <Skeleton className="h-14 w-24 bg-white/20" />
        </div>
      </div>

      {/* Meals section skeleton */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-4">
          <Skeleton className="h-12 w-12 bg-black/20" />
          <Skeleton className="h-6 w-32 bg-white/20" />
        </div>
        <div className="p-5 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workouts section skeleton */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-black p-4 flex items-center gap-4">
          <Skeleton className="h-12 w-12 bg-primary/30" />
          <Skeleton className="h-6 w-32 bg-neutral-700" />
        </div>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Reflection skeleton */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-5 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    </div>
  );
}
