export default function MealPlanLoading() {
  return (
    <div className="space-y-0">
      {/* Header skeleton */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-[#00FF94]/30 animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-neutral-700 animate-pulse mb-2" />
            <div className="h-3 w-32 bg-neutral-700 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Day selector skeleton */}
      <div className="flex gap-0 overflow-x-auto border-4 border-black -mt-1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`flex-1 h-14 border-e-4 border-black last:border-e-0 ${i === 0 ? "bg-black" : "bg-[#FFFEF5]"}`}
          >
            <div className="flex items-center justify-center h-full">
              <div className={`h-4 w-12 animate-pulse ${i === 0 ? "bg-neutral-700" : "bg-neutral-200"}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Meal cards skeleton */}
      <div className="space-y-0 -mt-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-4 border-black -mt-1 bg-[#FFFEF5]">
            <div className="border-b-4 border-black p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-neutral-200 animate-pulse" />
              <div className="h-6 w-32 bg-neutral-200 animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              <div className="h-4 w-full bg-neutral-100 animate-pulse" />
              <div className="h-4 w-3/4 bg-neutral-100 animate-pulse" />
              <div className="flex gap-4 mt-3">
                <div className="h-8 w-20 border-2 border-black bg-neutral-100 animate-pulse" />
                <div className="h-8 w-20 border-2 border-black bg-neutral-100 animate-pulse" />
                <div className="h-8 w-20 border-2 border-black bg-neutral-100 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
