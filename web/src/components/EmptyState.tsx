import { Inbox } from 'lucide-react'
import { EmptyState as NewEmptyState } from './shared/EmptyState'

interface EmptyStateProps {
  title?: string
  message: string
  icon?: React.ReactNode
}

// Compatibility wrapper for old EmptyState usage
export function EmptyState({ title, message }: EmptyStateProps) {
  // If using the old EmptyIcon, use Inbox from lucide-react
  // Otherwise, this is a compatibility layer
  if (title) {
    return (
      <NewEmptyState
        icon={Inbox}
        title={title}
        description={message}
      />
    )
  }
  
  // Fallback for cases without title
  return (
    <NewEmptyState
      icon={Inbox}
      title="No Data"
      description={message}
    />
  )
}

// Default icon for empty states - now using lucide-react
export function EmptyIcon() {
  // Return a placeholder that will be replaced by the Inbox icon
  return null
}
