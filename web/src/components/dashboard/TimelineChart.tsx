import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TimelinePoint } from '@/api'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts'

interface TimelineChartProps {
  timeline: TimelinePoint[]
}

const chartConfig = {
  total: {
    label: 'Total Findings',
    color: 'hsl(var(--primary))',
  },
}

export function TimelineChart({ timeline }: TimelineChartProps) {
  // Format dates for display
  const data = timeline.map(point => ({
    ...point,
    date: new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    fullDate: new Date(point.timestamp).toLocaleString()
  }))

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value}
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <defs>
          <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          dataKey="total"
          type="monotone"
          fill="url(#fillTotal)"
          fillOpacity={0.4}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  )
}
