import { Skeleton } from "@fitfast/ui/skeleton";

export default function PanelLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
      </div>

      {/* Content skeleton */}
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
