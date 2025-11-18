import { TopRule } from '../api'

interface TopFailingRulesProps {
  rules: TopRule[]
}

interface SeverityConfig {
  color: string
  bgColor: string
}

const SEVERITY_CONFIG: Record<string, SeverityConfig> = {
  CRITICAL: {
    color: 'bg-red-400',
    bgColor: 'bg-red-400/10',
  },
  HIGH: {
    color: 'bg-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  MEDIUM: {
    color: 'bg-yellow-400',
    bgColor: 'bg-yellow-400/10',
  },
  LOW: {
    color: 'bg-blue-400',
    bgColor: 'bg-blue-400/10',
  },
}

export function TopFailingRules({ rules }: TopFailingRulesProps) {
  // Sort rules by count in descending order and take top 5
  const topRules = [...rules]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Handle empty state
  if (topRules.length === 0) {
    return (
      <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
        <div className="text-sm text-neutral-400 mb-4 font-mono-custom">Top Failing Rules</div>
        <div className="flex items-center justify-center h-48 text-neutral-500">
          No rules to display
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
      <div className="text-sm text-neutral-400 mb-4 font-mono-custom">Top Failing Rules</div>

      <div className="space-y-3">
        {topRules.map((rule, index) => {
          const severityConfig = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.LOW

          return (
            <div
              key={rule.rule_id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-800/30 transition-colors"
            >
              {/* Rank number */}
              <div className="flex-shrink-0 w-6 text-center">
                <span className="text-sm font-bold text-neutral-400">
                  {index + 1}
                </span>
              </div>

              {/* Severity indicator dot */}
              <div
                className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${severityConfig.color}`}
                aria-label={`${rule.severity} severity`}
                title={rule.severity}
              />

              {/* Rule ID with monospace font */}
              <div className="flex-1 min-w-0">
                <code className="text-sm text-neutral-200 font-mono-custom break-all">
                  {rule.rule_id}
                </code>
              </div>

              {/* Finding count badge */}
              <div
                className={`flex-shrink-0 px-3 py-1 rounded-md ${severityConfig.bgColor}`}
              >
                <span className="text-sm font-bold text-neutral-100">
                  {rule.count}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
