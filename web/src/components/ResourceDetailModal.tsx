import { Resource, Finding } from '../api'
import { Badge } from './ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'

interface ResourceDetailModalProps {
  resource: Resource | null
  findings: Finding[]
  open: boolean
  onClose: () => void
}

export default function ResourceDetailModal({
  resource,
  findings,
  open,
  onClose,
}: ResourceDetailModalProps) {
  if (!resource) return null

  const getComplianceColor = () => {
    switch (resource.compliance_status) {
      case 'COMPLIANT':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'NON_COMPLIANT':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const JsonDisplay = ({ data }: { data: any }) => (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <pre className="text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </ScrollArea>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <Badge className={getComplianceColor()}>
              {resource.compliance_status}
            </Badge>
            <span className="text-base font-medium">
              {resource.resource_type.replace('AWS::', '')}
            </span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-mono break-all">
            {resource.arn}
          </p>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          {/* Compliance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Drift Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(resource.drift_score * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{resource.findings_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last Evaluated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {new Date(resource.last_evaluated).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Details Tabs */}
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="desired">Desired Config</TabsTrigger>
              <TabsTrigger value="findings">
                Findings ({findings.length})
              </TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-4">
              <JsonDisplay data={resource.config} />
            </TabsContent>

            <TabsContent value="desired" className="mt-4">
              {resource.desired_config ? (
                <div className="space-y-3">
                  {resource.base_config_applied && (
                    <div className="text-sm">
                      <span className="font-medium">Base Config: </span>
                      <span className="text-muted-foreground">
                        {resource.base_config_applied}
                      </span>
                    </div>
                  )}
                  {resource.groups_applied && resource.groups_applied.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Groups Applied: </span>
                      <span className="text-muted-foreground">
                        {resource.groups_applied.join(', ')}
                      </span>
                    </div>
                  )}
                  <JsonDisplay data={resource.desired_config} />
                </div>
              ) : (
                <p className="text-muted-foreground p-4 text-center">
                  No desired configuration available
                </p>
              )}
            </TabsContent>

            <TabsContent value="findings" className="mt-4">
              {findings.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {findings.map((finding) => (
                      <Card key={finding.finding_id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  finding.severity === 'HIGH' ? 'destructive' :
                                  finding.severity === 'MEDIUM' ? 'default' :
                                  'secondary'
                                }
                              >
                                {finding.severity}
                              </Badge>
                              <span className="text-sm font-medium">{finding.rule_id}</span>
                            </div>
                            {finding.status && (
                              <Badge variant="outline">{finding.status}</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            {finding.message}
                          </p>
                          {finding.differences && finding.differences.length > 0 && (
                            <div className="mt-2 text-xs space-y-1">
                              <p className="font-medium">Differences:</p>
                              {finding.differences.slice(0, 5).map((diff, idx) => (
                                <div key={idx} className="pl-2 border-l-2 border-muted">
                                  <span className="font-mono">{diff.path}</span>
                                </div>
                              ))}
                              {finding.differences.length > 5 && (
                                <p className="text-muted-foreground pl-2">
                                  +{finding.differences.length - 5} more...
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center p-8">
                  <p className="text-green-600 dark:text-green-400 text-lg">
                    ✓ No findings - resource is compliant
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              <JsonDisplay data={resource.metadata} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
