import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TopRule } from '@/api'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'

interface TopRulesChartProps {
  rules: TopRule[]
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

export function TopRulesChart({ rules }: TopRulesChartProps) {
  // Sort rules by count and take top 5
  const topRules = [...rules]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Transform data for Recharts
  const chartData = topRules.map((rule) => ({
    rule_id: rule.rule_id.length > 30 ? `${rule.rule_id.substring(0, 30)}...` : rule.rule_id,
    fullRuleId: rule.rule_id,
    count: rule.count,
    severity: rule.severity,
    fill: SEVERITY_COLORS[rule.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.LOW,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Failing Rules</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="rule_id"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                angle={-45}
                textAnchor="end"
                height={80}
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
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                formatter={(value: number, _name: string, props: any) => {
                  return [
                    value,
                    `${props.payload.fullRuleId} (${props.payload.severity})`,
                  ]
                }}
              />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
