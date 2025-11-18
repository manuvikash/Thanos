// Base skeleton component for reusable loading animations
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-neutral-800/50 rounded ${className}`}
      aria-hidden="true"
    />
  )
}

// Loading skeleton for Overview Metrics section
export function OverviewMetricsSkeleton() {
  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex items-end justify-between mb-4">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-3 w-48 mb-2" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
}

// Loading skeleton for Severity Distribution section
export function SeverityDistributionSkeleton() {
  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
      <Skeleton className="h-4 w-40 mb-4" />
      <div className="flex flex-col md:flex-row items-center gap-6">
        <Skeleton className="w-48 h-48 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Loading skeleton for Top Failing Rules section
export function TopFailingRulesSkeleton() {
  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
      <Skeleton className="h-4 w-36 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="w-6 h-4" />
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="flex-1 h-4" />
            <Skeleton className="w-12 h-6 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Loading skeleton for Findings Timeline section
export function FindingsTimelineSkeleton() {
  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
      <Skeleton className="h-4 w-36 mb-4" />
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded" />
        <div className="flex flex-wrap gap-4 justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-sm" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Generic section loading skeleton
export function SectionLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-neutral-700 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-sm text-neutral-400">Loading...</p>
      </div>
    </div>
  )
}
