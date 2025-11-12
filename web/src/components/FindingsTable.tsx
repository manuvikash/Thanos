import { useEffect, useState } from 'react'
import { Finding, getFindings } from '../api'

interface FindingsTableProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
}

export default function FindingsTable({ findings: initialFindings, tenantId, loading }: FindingsTableProps) {
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-900/30'
      case 'HIGH':
        return 'text-orange-400 bg-orange-900/30'
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-900/30'
      case 'LOW':
        return 'text-blue-400 bg-blue-900/30'
      default:
        return 'text-gray-400 bg-gray-900/30'
    }
  }

  const truncate = (str: string, maxLen: number = 60) => {
    if (str.length <= maxLen) return str
    return str.substring(0, maxLen) + '...'
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        <p className="mt-4 text-gray-400">Running scan...</p>
      </div>
    )
  }

  if (allFindings.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
        <p className="text-gray-400">No findings yet. Run a scan to get started.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-2xl font-semibold text-blue-400">Findings</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Rule ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Region
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {allFindings.map((finding) => (
              <tr key={finding.finding_id} className="hover:bg-gray-750">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(finding.severity)}`}>
                    {finding.severity}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300 font-mono">
                  {finding.rule_id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300 font-mono">
                  {truncate(finding.resource_arn, 40)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {finding.message}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {finding.region}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cursor && (
        <div className="px-6 py-4 border-t border-gray-700 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 px-6 rounded-md transition duration-200 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
