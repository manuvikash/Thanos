import { ResourceDetail } from '@/api'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ResourceDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  resource: ResourceDetail | null
}

export default function ResourceDetailsSheet({
  isOpen,
  onClose,
  resource,
}: ResourceDetailsSheetProps) {
  if (!resource) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Resource Details</SheetTitle>
          <SheetDescription className="font-mono text-xs break-all">
            {resource.arn}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="config" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            <ScrollArea className="h-[calc(100vh-250px)] w-full rounded-md border p-4">
              <pre className="text-sm text-foreground">
                {JSON.stringify(resource.config, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metadata" className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Resource Type
                </label>
                <p className="mt-1 text-sm text-foreground font-mono">
                  {resource.resource_type}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Region
                </label>
                <p className="mt-1 text-sm text-foreground font-mono">
                  {resource.region}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Account ID
                </label>
                <p className="mt-1 text-sm text-foreground font-mono">
                  {resource.account_id}
                </p>
              </div>

              {resource.metadata && Object.keys(resource.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Additional Metadata
                  </label>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4 mt-1">
                    <pre className="text-sm text-foreground">
                      {JSON.stringify(resource.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
