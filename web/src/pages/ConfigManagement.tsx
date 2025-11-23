import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BaseConfigs from '@/components/config/BaseConfigs';
import ResourceGroups from '@/components/config/ResourceGroups';
import Templates from '@/components/config/Templates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileCode2, FolderTree, GitMerge, CheckCircle2 } from 'lucide-react';

export default function ConfigManagement() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Hierarchical Configuration</h1>
        <p className="text-muted-foreground">
          Define desired configurations hierarchically: Base configs → Resource groups → Instance overrides
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            A hierarchical approach to managing AWS resource configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileCode2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Step 1</div>
                    <CardTitle className="text-base">Base Config</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Define what ALL resources of a type should look like
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FolderTree className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Step 2</div>
                    <CardTitle className="text-base">Resource Groups</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Tag-based groups that add or override config (e.g., production buckets need versioning)
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <GitMerge className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Step 3</div>
                    <CardTitle className="text-base">Automatic Merge</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  System merges base + matching groups hierarchically
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Step 4</div>
                    <CardTitle className="text-base">Compliance Check</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Compare actual resource config vs. desired config and report differences
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="base-configs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="base-configs">Base Configurations</TabsTrigger>
          <TabsTrigger value="resource-groups">Resource Groups</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="base-configs">
          <BaseConfigs />
        </TabsContent>

        <TabsContent value="resource-groups">
          <ResourceGroups />
        </TabsContent>

        <TabsContent value="templates">
          <Templates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
