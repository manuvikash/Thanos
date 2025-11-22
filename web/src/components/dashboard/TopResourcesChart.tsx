import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TopResource } from '@/api'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell, LabelList } from 'recharts'

interface TopResourcesChartProps {
  resources: TopResource[]
}

const SEVERITY_COLORS = {
  CRITICAL: 'hsl(0, 84%, 60%)',
  HIGH: 'hsl(25, 95%, 53%)',
  MEDIUM: 'hsl(45, 93%, 47%)',
  LOW: 'hsl(217, 91%, 60%)',
} as const

const chartConfig = {
  count: {
    label: 'Findings',
  },
}

export function TopResourcesChart({ resources }: TopResourcesChartProps) {
  // Sort by count descending
  const sortedResources = [...resources].sort((a, b) => b.count - a.count)

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart
        accessibilityLayer
        data={sortedResources}
        layout="vertical"
        margin={{
          left: 0,
          right: 30,
          top: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid horizontal={false} vertical={true} strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis type="number" hide />
        <YAxis
          dataKey="resource_type"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          width={150}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <ChartTooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
          {sortedResources.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.MEDIUM} 
            />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
