export default function WorkoutPlanLoading() {
  return (
    <div className="space-y-0">
      {/* Header skeleton */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-[#FF3B00]/30 animate-pulse" />
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

      {/* Exercise cards skeleton */}
      <div className="space-y-0 -mt-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-4 border-black -mt-1 bg-[#FFFEF5]">
            <div className="border-b-4 border-black p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-neutral-200 animate-pulse" />
              <div className="h-6 w-40 bg-neutral-200 animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="border-4 border-black p-4">
                  <div className="h-8 w-12 bg-neutral-200 animate-pulse mb-1" />
                  <div className="h-3 w-16 bg-neutral-200 animate-pulse" />
                </div>
                <div className="border-4 border-black p-4">
                  <div className="h-8 w-12 bg-neutral-200 animate-pulse mb-1" />
                  <div className="h-3 w-16 bg-neutral-200 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
