interface SectionHeaderProps {
  title: string
  lastUpdated: Date | null
  onRefresh: () => void
  loading?: boolean
}

// Format timestamp as relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 10) {
    return 'Just now'
  } else if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`
  } else if (diffMinutes === 1) {
    return '1 minute ago'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`
  } else if (diffHours === 1) {
    return '1 hour ago'
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`
  } else if (diffDays === 1) {
    return '1 day ago'
  } else {
    return `${diffDays} days ago`
  }
}

export function SectionHeader({ title, lastUpdated, onRefresh, loading = false }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
      <h2 className="text-xl font-semibold text-neutral-100">{title}</h2>
      
      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-sm text-neutral-400 font-mono-custom">
            Updated {formatRelativeTime(lastUpdated)}
          </span>
        )}
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh section data"
        >
          <svg
            className={`w-4 h-4 text-neutral-300 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-sm text-neutral-300">Refresh</span>
        </button>
      </div>
    </div>
  )
}
