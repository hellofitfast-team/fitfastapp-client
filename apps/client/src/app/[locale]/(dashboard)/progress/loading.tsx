import { Skeleton } from "@fitfast/ui/skeleton";

export default function ProgressLoading() {
  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-10 w-64 rounded-lg" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
