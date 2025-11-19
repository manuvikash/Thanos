import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { SeverityCounts } from '@/api'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface SeverityChartProps {
  severityCounts: SeverityCounts
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: 'Critical',
    color: 'hsl(0, 84%, 60%)', // red
  },
  HIGH: {
    label: 'High',
    color: 'hsl(25, 95%, 53%)', // orange
  },
  MEDIUM: {
    label: 'Medium',
    color: 'hsl(45, 93%, 47%)', // yellow
  },
  LOW: {
    label: 'Low',
    color: 'hsl(217, 91%, 60%)', // blue
  },
} as const

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

export function SeverityChart({ severityCounts }: SeverityChartProps) {
  // Transform data for Recharts
  const chartData = Object.entries(severityCounts)
    .map(([severity, count]) => ({
      severity,
      count,
      label: SEVERITY_CONFIG[severity as keyof SeverityCounts].label,
      fill: SEVERITY_CONFIG[severity as keyof SeverityCounts].color,
    }))
    .filter((item) => item.count > 0)

  const total = Object.values(severityCounts).reduce((sum, count) => sum + count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Severity Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-2xl font-bold"
              >
                {total}
              </text>
              <text
                x="50%"
                y="50%"
                dy={20}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-sm"
              >
                Total
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
