import { useMemo } from 'react'
import { Finding } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FindingsDataTable } from './FindingsDataTable'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface RegionalFindingsViewProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
  customerName?: string
}

export function RegionalFindingsView({
  findings,
  tenantId,
  loading,
  customerName,
}: RegionalFindingsViewProps) {
  // Group findings by region
  const findingsByRegion = useMemo(() => {
    const grouped: Record<string, Finding[]> = {}
    
    findings.forEach((finding) => {
      const region = finding.region || 'Unknown Region'
      if (!grouped[region]) {
        grouped[region] = []
      }
      grouped[region].push(finding)
    })
    
    // Sort regions alphabetically
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }, [findings])

  // Calculate summary stats per region
  const regionStats = useMemo(() => {
    return findingsByRegion.map(([region, regionFindings]) => {
      const critical = regionFindings.filter(f => f.severity === 'CRITICAL').length
      const high = regionFindings.filter(f => f.severity === 'HIGH').length
      const medium = regionFindings.filter(f => f.severity === 'MEDIUM').length
      const low = regionFindings.filter(f => f.severity === 'LOW').length
      
      return {
        region,
        total: regionFindings.length,
        critical,
        high,
        medium,
        low,
      }
    })
  }, [findingsByRegion])

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Regional Findings</CardTitle>
            <CardDescription>Loading findings by region...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading findings...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (findings.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Regional Findings</CardTitle>
            <CardDescription>No findings to display</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              No findings yet. Run a scan to get started.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            Regional Findings Overview
            {customerName && <span className="ml-2 text-muted-foreground">- {customerName}</span>}
          </CardTitle>
          <CardDescription>
            Findings grouped by AWS region ({findingsByRegion.length} regions, {findings.length} total findings)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regionStats.map(({ region, total, critical, high, medium, low }) => (
              <div
                key={region}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{region}</h3>
                    <p className="text-sm text-muted-foreground">{total} findings</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {total}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {critical > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span>{critical} Critical</span>
                    </div>
                  )}
                  {high > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>{high} High</span>
                    </div>
                  )}
                  {medium > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span>{medium} Medium</span>
                    </div>
                  )}
                  {low > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>{low} Low</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regional Findings Tables */}
      <Accordion type="multiple" defaultValue={findingsByRegion.map(([region]) => region)}>
        {findingsByRegion.map(([region, regionFindings]) => (
          <AccordionItem key={region} value={region} className="border rounded-lg mb-4">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 text-left">
                  <span className="font-semibold text-lg">{region}</span>
                  <span className="ml-3 text-sm text-muted-foreground">
                    {regionFindings.length} finding{regionFindings.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  {regionStats.find(s => s.region === region)?.critical! > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {regionStats.find(s => s.region === region)?.critical} Critical
                    </Badge>
                  )}
                  {regionStats.find(s => s.region === region)?.high! > 0 && (
                    <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                      {regionStats.find(s => s.region === region)?.high} High
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className="border-t">
                <FindingsDataTable
                  findings={regionFindings}
                  totalCount={regionFindings.length}
                  loading={false}
                  itemsPerPage={10}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
