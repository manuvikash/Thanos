import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface SeverityConfig {
  variant: 'destructive' | 'default' | 'secondary' | 'outline'
  icon: React.ComponentType<{ className?: string }>
  className?: string
}

const severityConfig: Record<Severity, SeverityConfig> = {
  CRITICAL: {
    variant: 'destructive',
    icon: AlertCircle,
    className: 'bg-red-900/30 text-red-400 border-red-800',
  },
  HIGH: {
    variant: 'default',
    icon: AlertTriangle,
    className: 'bg-orange-900/30 text-orange-400 border-orange-800',
  },
  MEDIUM: {
    variant: 'secondary',
    icon: Info,
    className: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  },
  LOW: {
    variant: 'outline',
    icon: CheckCircle,
    className: 'bg-blue-900/30 text-blue-400 border-blue-800',
  },
}

interface SeverityBadgeProps {
  severity: string
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const normalizedSeverity = severity.toUpperCase() as Severity
  const config = severityConfig[normalizedSeverity] || severityConfig.LOW
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn('gap-1', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {normalizedSeverity}
    </Badge>
  )
}
