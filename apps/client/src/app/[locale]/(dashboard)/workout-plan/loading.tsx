import { Skeleton } from "@fitfast/ui/skeleton";

export default function WorkoutPlanLoading() {
  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-14 rounded-lg shrink-0" />
        ))}
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
