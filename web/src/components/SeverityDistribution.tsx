import { useState } from 'react'
import { SeverityCounts } from '../api'

interface SeverityDistributionProps {
  severityCounts: SeverityCounts
}

interface SeverityConfig {
  label: string
  color: string
  bgColor: string
}

const SEVERITY_CONFIG: Record<keyof SeverityCounts, SeverityConfig> = {
  CRITICAL: {
    label: 'Critical',
    color: '#f87171', // red-400
    bgColor: 'bg-red-400/10',
  },
  HIGH: {
    label: 'High',
    color: '#fb923c', // orange-400
    bgColor: 'bg-orange-400/10',
  },
  MEDIUM: {
    label: 'Medium',
    color: '#facc15', // yellow-400
    bgColor: 'bg-yellow-400/10',
  },
  LOW: {
    label: 'Low',
    color: '#60a5fa', // blue-400
    bgColor: 'bg-blue-400/10',
  },
}

const SEVERITY_ORDER: (keyof SeverityCounts)[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function SeverityDistribution({ severityCounts }: SeverityDistributionProps) {
  const [hoveredSeverity, setHoveredSeverity] = useState<keyof SeverityCounts | null>(null)

  // Calculate total findings
  const total = Object.values(severityCounts).reduce((sum, count) => sum + count, 0)

  // If no findings, show empty state
  if (total === 0) {
    return (
      <div className="bg-card border rounded-lg p-6 backdrop-blur-sm">
        <div className="text-sm text-muted-foreground mb-4 font-mono-custom">Severity Distribution</div>
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          No findings to display
        </div>
      </div>
    )
  }

  // Calculate arc paths for donut chart
  const createArcPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number): string => {
    const startRad = (startAngle - 90) * (Math.PI / 180)
    const endRad = (endAngle - 90) * (Math.PI / 180)

    const x1 = 50 + outerRadius * Math.cos(startRad)
    const y1 = 50 + outerRadius * Math.sin(startRad)
    const x2 = 50 + outerRadius * Math.cos(endRad)
    const y2 = 50 + outerRadius * Math.sin(endRad)

    const x3 = 50 + innerRadius * Math.cos(endRad)
    const y3 = 50 + innerRadius * Math.sin(endRad)
    const x4 = 50 + innerRadius * Math.cos(startRad)
    const y4 = 50 + innerRadius * Math.sin(startRad)

    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    return [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ')
  }

  // Generate donut segments
  const segments = SEVERITY_ORDER.map((severity) => {
    const count = severityCounts[severity]
    const percentage = (count / total) * 100
    return {
      severity,
      count,
      percentage,
      config: SEVERITY_CONFIG[severity],
    }
  }).filter((segment) => segment.count > 0)

  let currentAngle = 0
  const donutSegments = segments.map((segment) => {
    const angle = (segment.count / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const isHovered = hoveredSeverity === segment.severity
    const outerRadius = isHovered ? 42 : 40
    const innerRadius = 25

    return {
      ...segment,
      path: createArcPath(startAngle, endAngle, innerRadius, outerRadius),
      isHovered,
    }
  })

  return (
    <div className="bg-card border rounded-lg p-6 backdrop-blur-sm">
      <div className="text-sm text-muted-foreground mb-4 font-mono-custom">Severity Distribution</div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="w-48 h-48"
            role="img"
            aria-label={`Severity distribution chart showing ${total} total findings`}
          >
            <title>Severity Distribution</title>
            {donutSegments.map((segment) => (
              <g key={segment.severity}>
                <path
                  d={segment.path}
                  fill={segment.config.color}
                  opacity={hoveredSeverity === null || segment.isHovered ? 1 : 0.4}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredSeverity(segment.severity)}
                  onMouseLeave={() => setHoveredSeverity(null)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${segment.config.label}: ${segment.count} findings (${segment.percentage.toFixed(1)}%)`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setHoveredSeverity(segment.severity === hoveredSeverity ? null : segment.severity)
                    }
                  }}
                />
              </g>
            ))}

            {/* Center text showing total */}
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-2xl font-bold fill-neutral-100"
              style={{ fontSize: '12px' }}
            >
              {total}
            </text>
            <text
              x="50"
              y="58"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-neutral-400"
              style={{ fontSize: '4px' }}
            >
              Total
            </text>
          </svg>

          {/* Tooltip on hover */}
          {hoveredSeverity && (
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              role="tooltip"
              aria-live="polite"
            >
              <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 shadow-lg">
                <div className="text-xs text-card-foreground font-semibold">
                  {SEVERITY_CONFIG[hoveredSeverity].label}
                </div>
                <div className="text-sm text-foreground font-bold">
                  {severityCounts[hoveredSeverity]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((severityCounts[hoveredSeverity] / total) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 w-full">
          {segments.map((segment) => {
            const isHovered = hoveredSeverity === segment.severity
            return (
              <div
                key={segment.severity}
                className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                  isHovered ? segment.config.bgColor : 'hover:bg-neutral-800/30'
                }`}
                onMouseEnter={() => setHoveredSeverity(segment.severity)}
                onMouseLeave={() => setHoveredSeverity(null)}
                role="button"
                tabIndex={0}
                aria-label={`${segment.config.label}: ${segment.count} findings`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setHoveredSeverity(segment.severity === hoveredSeverity ? null : segment.severity)
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segment.config.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-card-foreground font-medium">
                    {segment.config.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-mono-custom">
                    {segment.percentage.toFixed(1)}%
                  </span>
                  <span className="text-sm font-bold text-foreground min-w-[3rem] text-right">
                    {segment.count}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
