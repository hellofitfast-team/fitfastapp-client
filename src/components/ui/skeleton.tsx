import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("animate-pulse rounded-lg bg-neutral-200", className)}
      {...props}
    />
  );
}

export function SkeletonText({
  className,
  lines = 3,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Loading" {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 animate-pulse rounded-md bg-neutral-200",
            i === lines - 1 && "w-3/4"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({
  className,
  size = 40,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("animate-pulse rounded-full bg-neutral-200", className)}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}

export function SkeletonCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("rounded-xl border border-border p-5 space-y-3", className)}
      {...props}
    >
      <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-200" />
      <div className="space-y-2">
        <div className="h-3 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-3 w-4/5 animate-pulse rounded-md bg-neutral-200" />
      </div>
    </div>
  );
}
