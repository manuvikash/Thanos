import { useState } from 'react'
import { TimelinePoint } from '../api'

interface FindingsTimelineProps {
  timeline: TimelinePoint[]
}

interface SeverityConfig {
  color: string
  label: string
}

const SEVERITY_CONFIG: Record<string, SeverityConfig> = {
  CRITICAL: { color: '#f87171', label: 'Critical' },
  HIGH: { color: '#fb923c', label: 'High' },
  MEDIUM: { color: '#facc15', label: 'Medium' },
  LOW: { color: '#60a5fa', label: 'Low' },
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

export function FindingsTimeline({ timeline }: FindingsTimelineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Handle empty state
  if (timeline.length === 0) {
    return (
      <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
        <div className="text-sm text-neutral-400 mb-4 font-mono-custom">Findings Timeline</div>
        <div className="flex items-center justify-center h-64 text-neutral-500">
          No timeline data available
        </div>
      </div>
    )
  }

  // Chart dimensions
  const width = 600
  const height = 250
  const padding = { top: 20, right: 20, bottom: 60, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate max value for Y-axis scaling
  const maxValue = Math.max(...timeline.map((point) => point.total))
  const yScale = maxValue > 0 ? chartHeight / maxValue : 1

  // Calculate X positions for each data point
  const xStep = chartWidth / Math.max(timeline.length - 1, 1)

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

  // Generate stacked area paths for each severity level
  const generateStackedPaths = () => {
    const paths: { severity: string; path: string; color: string }[] = []
    
    // Build cumulative data for stacking
    const stackedData = timeline.map((point) => {
      let cumulative = 0
      const stacked: Record<string, { start: number; end: number }> = {}
      
      SEVERITY_ORDER.forEach((severity) => {
        const count = point.severity_counts[severity] || 0
        stacked[severity] = { start: cumulative, end: cumulative + count }
        cumulative += count
      })
      
      return stacked
    })

    // Generate path for each severity level
    SEVERITY_ORDER.forEach((severity) => {
      const points: string[] = []
      
      // Top line (going left to right)
      timeline.forEach((_, index) => {
        const x = padding.left + index * xStep
        const yValue = stackedData[index][severity].end
        const y = padding.top + chartHeight - yValue * yScale
        
        if (index === 0) {
          points.push(`M ${x} ${y}`)
        } else {
          points.push(`L ${x} ${y}`)
        }
      })
      
      // Bottom line (going right to left)
      for (let index = timeline.length - 1; index >= 0; index--) {
        const x = padding.left + index * xStep
        const yValue = stackedData[index][severity].start
        const y = padding.top + chartHeight - yValue * yScale
        points.push(`L ${x} ${y}`)
      }
      
      points.push('Z') // Close the path
      
      paths.push({
        severity,
        path: points.join(' '),
        color: SEVERITY_CONFIG[severity].color,
      })
    })

    return paths.reverse() // Reverse so CRITICAL is on top
  }

  const stackedPaths = generateStackedPaths()

  // Handle mouse move for tooltip
  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>, index: number) => {
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    
    const rect = svg.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    setHoveredPoint(index)
    setTooltipPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
      <div className="text-sm text-neutral-400 mb-4 font-mono-custom">Findings Timeline</div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ maxHeight: '300px' }}
        >
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = padding.top + chartHeight - fraction * chartHeight
            const value = Math.round(maxValue * fraction)
            
            return (
              <g key={fraction}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-neutral-500"
                  style={{ fontSize: '10px' }}
                >
                  {value}
                </text>
              </g>
            )
          })}

          {/* Stacked area paths */}
          {stackedPaths.map(({ severity, path, color }) => (
            <path
              key={severity}
              d={path}
              fill={color}
              opacity="0.7"
              className="transition-opacity hover:opacity-90"
            />
          ))}

          {/* Interactive hover areas */}
          {timeline.map((point, index) => {
            const x = padding.left + index * xStep
            
            return (
              <rect
                key={point.snapshot_key}
                x={x - xStep / 2}
                y={padding.top}
                width={timeline.length === 1 ? chartWidth : xStep}
                height={chartHeight}
                fill="transparent"
                onMouseMove={(e) => handleMouseMove(e, index)}
                onMouseLeave={handleMouseLeave}
                className="cursor-pointer"
              />
            )
          })}

          {/* X-axis labels */}
          {timeline.map((point, index) => {
            const x = padding.left + index * xStep
            const y = padding.top + chartHeight + 20
            
            return (
              <text
                key={point.snapshot_key}
                x={x}
                y={y}
                textAnchor="middle"
                className="text-xs fill-neutral-500"
                style={{ fontSize: '10px' }}
              >
                {formatTimestamp(point.timestamp)}
              </text>
            )
          })}

          {/* Y-axis label */}
          <text
            x={padding.left - 35}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            className="text-xs fill-neutral-500"
            style={{ fontSize: '10px' }}
            transform={`rotate(-90 ${padding.left - 35} ${padding.top + chartHeight / 2})`}
          >
            Findings Count
          </text>
        </svg>

        {/* Tooltip */}
        {hoveredPoint !== null && (
          <div
            className="absolute z-10 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 10}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="text-xs text-neutral-400 mb-2 font-mono-custom">
              {formatTimestamp(timeline[hoveredPoint].timestamp)}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-neutral-100 mb-2">
                Total: {timeline[hoveredPoint].total}
              </div>
              {SEVERITY_ORDER.map((severity) => {
                const count = timeline[hoveredPoint].severity_counts[severity] || 0
                if (count === 0) return null
                
                return (
                  <div key={severity} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: SEVERITY_CONFIG[severity].color }}
                    />
                    <span className="text-neutral-300">
                      {SEVERITY_CONFIG[severity].label}:
                    </span>
                    <span className="font-bold text-neutral-100">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {SEVERITY_ORDER.map((severity) => (
          <div key={severity} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: SEVERITY_CONFIG[severity].color }}
            />
            <span className="text-xs text-neutral-400">
              {SEVERITY_CONFIG[severity].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
