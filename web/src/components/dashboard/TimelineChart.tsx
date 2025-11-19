import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TimelinePoint } from '@/api'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface TimelineChartProps {
  timeline: TimelinePoint[]
}

const chartConfig = {
  CRITICAL: {
    label: 'Critical',
    color: 'hsl(0, 84%, 60%)',
  },
  HIGH: {
    label: 'High',
    color: 'hsl(25, 95%, 53%)',
  },
  MEDIUM: {
    label: 'Medium',
    color: 'hsl(45, 93%, 47%)',
  },
  LOW: {
    label: 'Low',
    color: 'hsl(217, 91%, 60%)',
  },
}

export function TimelineChart({ timeline }: TimelineChartProps) {
  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Transform data for Recharts
  const chartData = timeline.map((point) => ({
    timestamp: formatTimestamp(point.timestamp),
    CRITICAL: point.severity_counts.CRITICAL || 0,
    HIGH: point.severity_counts.HIGH || 0,
    MEDIUM: point.severity_counts.MEDIUM || 0,
    LOW: point.severity_counts.LOW || 0,
    total: point.total,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Area
                type="monotone"
                dataKey="CRITICAL"
                stackId="1"
                stroke={chartConfig.CRITICAL.color}
                fill={chartConfig.CRITICAL.color}
                fillOpacity={0.7}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
              <Area
                type="monotone"
                dataKey="HIGH"
                stackId="1"
                stroke={chartConfig.HIGH.color}
                fill={chartConfig.HIGH.color}
                fillOpacity={0.7}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
              <Area
                type="monotone"
                dataKey="MEDIUM"
                stackId="1"
                stroke={chartConfig.MEDIUM.color}
                fill={chartConfig.MEDIUM.color}
                fillOpacity={0.7}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
              <Area
                type="monotone"
                dataKey="LOW"
                stackId="1"
                stroke={chartConfig.LOW.color}
                fill={chartConfig.LOW.color}
                fillOpacity={0.7}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
