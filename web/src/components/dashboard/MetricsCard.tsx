import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MetricsCardProps {
  totalFindings: number
  timestamp: string
  previousFindings?: number
}

export function MetricsCard({
  totalFindings,
  timestamp,
  previousFindings,
}: MetricsCardProps) {
  // Calculate percentage change from previous scan
  const calculateTrendPercentage = (): number | null => {
    if (previousFindings === undefined || previousFindings === 0) {
      return null
    }

    const change = totalFindings - previousFindings
    const percentage = (change / previousFindings) * 100
    return percentage
  }

  const trendPercentage = calculateTrendPercentage()

  // Determine trend direction and styling
  const getTrendInfo = () => {
    if (trendPercentage === null) {
      return null
    }

    const isIncrease = trendPercentage > 0
    const isDecrease = trendPercentage < 0
    const isNoChange = trendPercentage === 0

    return {
      percentage: Math.abs(trendPercentage),
      isIncrease,
      isDecrease,
      isNoChange,
      variant: isIncrease ? 'destructive' : isDecrease ? 'secondary' : 'outline',
      icon: isIncrease ? ArrowUp : isDecrease ? ArrowDown : Minus,
    }
  }

  const trendInfo = getTrendInfo()

  // Format timestamp for display
  const formatTimestamp = (ts: string): string => {
    const date = new Date(ts)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>Total Findings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-4">
          <div className="text-4xl font-bold">{totalFindings.toLocaleString()}</div>

          {trendInfo && (
            <Badge variant={trendInfo.variant as any} className="flex items-center gap-1">
              <trendInfo.icon className="w-3 h-3" />
              <span>{trendInfo.percentage.toFixed(1)}%</span>
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Last scan: {formatTimestamp(timestamp)}
          </p>

          {previousFindings !== undefined && (
            <p className="text-xs text-muted-foreground">
              Previous: {previousFindings.toLocaleString()} findings
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
