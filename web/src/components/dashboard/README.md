# Dashboard Skeleton Components

This directory contains loading skeleton components that match the structure of the actual dashboard components.

## Available Skeletons

### MetricsCardSkeleton
Matches the structure of `MetricsCard` component:
- Header with description placeholder
- Large number placeholder (h-10)
- Badge placeholder for trend indicator
- Two lines of timestamp information

**Usage:**
```tsx
import { MetricsCardSkeleton } from '@/components/dashboard/DashboardSkeletons'

{loading ? <MetricsCardSkeleton /> : <MetricsCard {...props} />}
```

### ChartCardSkeleton
Generic skeleton for any chart card:
- Header with title placeholder
- Full-height chart area (300px)

**Usage:**
```tsx
import { ChartCardSkeleton } from '@/components/dashboard/DashboardSkeletons'

{loading ? <ChartCardSkeleton /> : <AnyChart {...props} />}
```

### SeverityChartSkeleton
Specific skeleton for `SeverityChart` (pie chart):
- Header with title placeholder
- Circular skeleton (200x200px) to match pie chart appearance

**Usage:**
```tsx
import { SeverityChartSkeleton } from '@/components/dashboard/DashboardSkeletons'

{loading ? <SeverityChartSkeleton /> : <SeverityChart {...props} />}
```

### TimelineChartSkeleton
Specific skeleton for `TimelineChart` (area chart):
- Header with title placeholder
- Horizontal bars of varying heights to suggest timeline data
- X-axis label placeholders

**Usage:**
```tsx
import { TimelineChartSkeleton } from '@/components/dashboard/DashboardSkeletons'

{loading ? <TimelineChartSkeleton /> : <TimelineChart {...props} />}
```

### TopRulesChartSkeleton
Specific skeleton for `TopRulesChart` (bar chart):
- Header with title placeholder
- Five vertical bars of varying heights to suggest bar chart data
- Label placeholders below each bar

**Usage:**
```tsx
import { TopRulesChartSkeleton } from '@/components/dashboard/DashboardSkeletons'

{loading ? <TopRulesChartSkeleton /> : <TopRulesChart {...props} />}
```

## Design Principles

1. **Match Structure**: Each skeleton matches the exact structure of its corresponding component
2. **Appropriate Sizing**: Heights and widths are set to match the actual content dimensions
3. **Visual Hierarchy**: Larger elements use larger skeleton blocks
4. **Consistent Spacing**: Spacing matches the actual component layout
5. **shadcn/ui Integration**: Uses the shadcn `Skeleton` component for consistent styling

## Migration from Old Skeletons

The old skeleton components in `LoadingSkeleton.tsx` can be replaced with these new components:
- `OverviewMetricsSkeleton` → `MetricsCardSkeleton`
- `SeverityDistributionSkeleton` → `SeverityChartSkeleton`
- `TopFailingRulesSkeleton` → `TopRulesChartSkeleton`
- `FindingsTimelineSkeleton` → `TimelineChartSkeleton`
