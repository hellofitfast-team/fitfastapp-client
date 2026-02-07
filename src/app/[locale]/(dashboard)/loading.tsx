export default function DashboardLoading() {
  return (
    <div className="text-black">
      {/* Top Banner skeleton */}
      <div className="py-2 px-4 bg-black">
        <div className="h-4 w-3/4 bg-neutral-800 animate-pulse" />
      </div>

      {/* Header skeleton */}
      <div className="border-b-4 border-black px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="h-3 w-32 bg-neutral-200 animate-pulse mb-2" />
            <div className="h-12 w-64 bg-neutral-200 animate-pulse mb-2" />
            <div className="h-12 w-48 bg-[#FF3B00]/20 animate-pulse" />
          </div>
          <div className="text-end">
            <div className="h-16 w-20 bg-neutral-200 animate-pulse ms-auto" />
            <div className="h-3 w-24 bg-neutral-200 animate-pulse mt-1 ms-auto" />
          </div>
        </div>
      </div>

      {/* Stats Strip skeleton */}
      <div className="border-b-4 border-black">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-e-4 border-black p-6 last:border-e-0">
              <div className="h-3 w-20 bg-neutral-200 animate-pulse mb-2" />
              <div className="h-10 w-16 bg-neutral-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content skeleton */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Meals skeleton */}
          <div className="lg:col-span-7 border-e-0 lg:border-e-4 border-black">
            <div className="border-b-4 border-black p-6">
              <div className="h-3 w-16 bg-neutral-200 animate-pulse mb-1" />
              <div className="h-8 w-40 bg-neutral-200 animate-pulse" />
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-b-4 border-black flex">
                <div className="w-20 md:w-24 border-e-4 border-black p-4">
                  <div className="h-5 w-12 bg-neutral-200 animate-pulse mx-auto" />
                </div>
                <div className="flex-1 p-4">
                  <div className="h-6 w-48 bg-neutral-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Right Column skeleton */}
          <div className="lg:col-span-5">
            <div className="border-b-4 border-black p-6">
              <div className="h-3 w-16 bg-neutral-200 animate-pulse mb-1" />
              <div className="h-8 w-40 bg-neutral-200 animate-pulse mb-6" />
              <div className="h-32 bg-neutral-100 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
