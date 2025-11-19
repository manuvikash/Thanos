import { ErrorAlert } from './shared/ErrorAlert'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

// Compatibility wrapper for old ErrorState usage
export function ErrorState({ title = 'Error', message, onRetry }: ErrorStateProps) {
  return (
    <ErrorAlert
      title={title}
      message={message}
      onRetry={onRetry}
    />
  )
}
