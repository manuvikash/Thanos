import { Finding } from '@/api'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface FindingDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  finding: Finding | null
}

export default function FindingDetailsSheet({
  isOpen,
  onClose,
  finding,
}: FindingDetailsSheetProps) {
  if (!finding) return null

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'compliance':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Compliance</Badge>
      case 'type-golden':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Golden Config</Badge>
      case 'instance-golden':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Critical Golden Config</Badge>
      default:
        return <Badge variant="outline">Compliance</Badge>
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[800px] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Finding Details
            <Badge variant="outline">{finding.severity}</Badge>
            {getCategoryBadge(finding.category)}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs break-all">
            {finding.finding_id}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Rule</h3>
            <p className="text-sm font-medium">{finding.rule_id}</p>
            <p className="text-sm text-muted-foreground">{finding.message}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Resource</h3>
            <p className="font-mono text-sm break-all">{finding.resource_arn}</p>
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
              <span>Region: {finding.region}</span>
              <span>Account: {finding.account_id}</span>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-red-500 mb-2">Observed (Actual)</h3>
              <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/50 p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(finding.observed, null, 2)}
                </pre>
              </ScrollArea>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-500 mb-2">Expected (Golden)</h3>
              <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/50 p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(finding.expected, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
