import { CurrentScan, PreviousScan } from '../api'

interface DashboardMetricsProps {
  currentScan: CurrentScan
  previousScan: PreviousScan | null
}

export function DashboardMetrics({ currentScan, previousScan }: DashboardMetricsProps) {
  // Calculate percentage change from previous scan
  const calculateTrendPercentage = (): number | null => {
    if (!previousScan || previousScan.total_findings === 0) {
      return null
    }
    
    const change = currentScan.total_findings - previousScan.total_findings
    const percentage = (change / previousScan.total_findings) * 100
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
      color: isIncrease ? 'text-red-400' : isDecrease ? 'text-green-400' : 'text-neutral-400',
      bgColor: isIncrease ? 'bg-red-400/10' : isDecrease ? 'bg-green-400/10' : 'bg-neutral-400/10',
    }
  }

  const trendInfo = getTrendInfo()

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
      <div className="text-sm text-neutral-400 mb-2 font-mono-custom">Total Findings</div>
      
      <div className="flex items-end justify-between mb-4">
        <div className="text-5xl font-bold text-cyan-400">
          {currentScan.total_findings.toLocaleString()}
        </div>
        
        {trendInfo && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${trendInfo.bgColor}`}>
            {/* Trend arrow icon */}
            {trendInfo.isIncrease && (
              <svg
                className={`w-4 h-4 ${trendInfo.color}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            )}
            {trendInfo.isDecrease && (
              <svg
                className={`w-4 h-4 ${trendInfo.color}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            {trendInfo.isNoChange && (
              <svg
                className={`w-4 h-4 ${trendInfo.color}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14"
                />
              </svg>
            )}
            
            <span className={`text-sm font-semibold ${trendInfo.color}`}>
              {trendInfo.percentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="text-xs text-neutral-500 font-mono-custom">
        Last scan: {formatTimestamp(currentScan.timestamp)}
      </div>
      
      {previousScan && (
        <div className="text-xs text-neutral-600 font-mono-custom mt-1">
          Previous: {previousScan.total_findings.toLocaleString()} findings
        </div>
      )}
    </div>
  )
}
