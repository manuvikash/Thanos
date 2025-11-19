import { useEffect, useState } from 'react'
import { Finding, getFindings } from '../api'
import { FindingsDataTable } from './findings/FindingsDataTable'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'

interface FindingsTableProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
}

export default function FindingsTable({
  findings: initialFindings,
  tenantId,
  loading,
}: FindingsTableProps) {
  const [allFindings, setAllFindings] = useState<Finding[]>(initialFindings)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()

  useEffect(() => {
    setAllFindings(initialFindings)
  }, [initialFindings])

  const loadMore = async () => {
    if (!tenantId || !cursor) return

    setLoadingMore(true)
    try {
      const response = await getFindings(tenantId, 50, cursor)
      setAllFindings([...allFindings, ...response.items])
      setCursor(response.next_cursor)
    } catch (err) {
      console.error('Error loading more findings:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Findings Data Table with integrated filters */}
      <FindingsDataTable
        findings={allFindings}
        totalCount={allFindings.length}
        loading={loading}
        itemsPerPage={20}
      />

      {/* Load More Button for cursor-based pagination */}
      {cursor && !loading && (
        <div className="flex justify-center">
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loadingMore && <Spinner />}
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  )
}
