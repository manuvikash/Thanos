import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { SeverityCounts } from '@/api'
import { PieChart, Pie, Cell, Legend, Label } from 'recharts'

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
}

export function SeverityChart({ severityCounts }: SeverityChartProps) {
  const data = [
    { name: 'Critical', value: severityCounts.CRITICAL, fill: SEVERITY_CONFIG.CRITICAL.color },
    { name: 'High', value: severityCounts.HIGH, fill: SEVERITY_CONFIG.HIGH.color },
    { name: 'Medium', value: severityCounts.MEDIUM, fill: SEVERITY_CONFIG.MEDIUM.color },
    { name: 'Low', value: severityCounts.LOW, fill: SEVERITY_CONFIG.LOW.color },
  ].filter((item) => item.value > 0)

  const total = Object.values(severityCounts).reduce((a, b) => a + b, 0)

  const chartConfig = {
    findings: {
      label: 'Findings',
    },
    CRITICAL: {
      label: 'Critical',
      color: SEVERITY_CONFIG.CRITICAL.color,
    },
    HIGH: {
      label: 'High',
      color: SEVERITY_CONFIG.HIGH.color,
    },
    MEDIUM: {
      label: 'Medium',
      color: SEVERITY_CONFIG.MEDIUM.color,
    },
    LOW: {
      label: 'Low',
      color: SEVERITY_CONFIG.LOW.color,
    },
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-3xl font-bold"
                    >
                      {total.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="fill-muted-foreground text-xs"
                    >
                      Total
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </Pie>
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle"
          formatter={(value) => (
            <span className="text-sm text-muted-foreground ml-1">{value}</span>
          )}
        />
      </PieChart>
    </ChartContainer>
  )
}
