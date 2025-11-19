import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for Overview Metrics section
 * Uses shadcn Card and Skeleton components for consistent styling
 */
export function OverviewMetricsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-[100px]" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-4">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-6 w-[60px] rounded-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-[180px]" />
          <Skeleton className="h-3 w-[140px]" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for Severity Distribution section
 * Shows a circular skeleton to match the pie chart appearance
 */
export function SeverityDistributionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[180px]" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for Top Failing Rules section
 * Shows vertical bars to suggest bar chart data
 */
export function TopFailingRulesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[160px]" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-end justify-around gap-4 p-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <Skeleton className="h-[140px] w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <Skeleton className="h-[80px] w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <Skeleton className="h-[60px] w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for Findings Timeline section
 * Shows horizontal bars to suggest timeline data
 */
export function FindingsTimelineSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[160px]" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] space-y-4 flex flex-col justify-end p-4">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[80px] w-full" />
          <Skeleton className="h-[100px] w-full" />
          <Skeleton className="h-[70px] w-full" />
          <div className="flex justify-between pt-2">
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[60px]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Generic section loading skeleton with spinner
 * Used for general loading states
 */
export function SectionLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
