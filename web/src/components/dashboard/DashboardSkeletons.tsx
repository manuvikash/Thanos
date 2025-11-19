import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Loading skeleton for MetricsCard component
 * Matches the structure: header with description, large number, badge, and timestamp info
 * 
 * Usage:
 * ```tsx
 * {loading ? <MetricsCardSkeleton /> : <MetricsCard {...props} />}
 * ```
 */
export function MetricsCardSkeleton() {
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
 * Loading skeleton for chart cards (SeverityChart, TimelineChart, TopRulesChart)
 * Matches the structure: header with title and chart content area
 */
export function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[180px]" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton specifically for SeverityChart (pie chart)
 * Shows a circular skeleton to match the pie chart appearance
 */
export function SeverityChartSkeleton() {
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
 * Loading skeleton for TimelineChart (area chart)
 * Shows horizontal bars to suggest timeline data
 */
export function TimelineChartSkeleton() {
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
 * Loading skeleton for TopRulesChart (bar chart)
 * Shows vertical bars to suggest bar chart data
 */
export function TopRulesChartSkeleton() {
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
 * Loading skeleton for FindingsDataTable component
 * Matches the structure: table headers with 6 columns and multiple rows
 * 
 * Usage:
 * ```tsx
 * {loading ? <FindingsTableSkeleton /> : <FindingsDataTable {...props} />}
 * ```
 */
export function FindingsTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[100px]" />
        <Skeleton className="h-4 w-[200px] mt-2" />
      </CardHeader>
      <CardContent>
        {/* Filter skeleton */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-[60px]" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-[80px]" />
              <Skeleton className="h-5 w-[60px]" />
              <Skeleton className="h-5 w-[70px]" />
              <Skeleton className="h-5 w-[50px]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-[90px]" />
            <Skeleton className="h-9 w-[180px]" />
          </div>
          <Skeleton className="h-9 w-[100px]" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-4 w-[70px]" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-[110px]" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-[60px]" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-[80px]" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-[70px]" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-[60px]" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-6 w-[80px] rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-[70px] rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[250px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[90px]" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination skeleton */}
        <div className="mt-4 flex items-center justify-between">
          <Skeleton className="h-4 w-[200px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[80px]" />
            <Skeleton className="h-9 w-[32px]" />
            <Skeleton className="h-9 w-[32px]" />
            <Skeleton className="h-9 w-[32px]" />
            <Skeleton className="h-9 w-[80px]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
