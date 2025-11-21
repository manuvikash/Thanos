import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BaseConfigs from '@/components/config/BaseConfigs';
import ResourceGroups from '@/components/config/ResourceGroups';
import Templates from '@/components/config/Templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConfigManagement() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Hierarchical Configuration</h1>
        <p className="text-muted-foreground">
          Define desired configurations hierarchically: Base configs → Resource groups → Instance overrides
        </p>
      </div>

      <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">1. Base Config:</span>
            <span>Define what ALL resources of a type should look like</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">2. Resource Groups:</span>
            <span>Tag-based groups that add or override config (e.g., production buckets need versioning)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">3. Automatic Merge:</span>
            <span>System merges base + matching groups hierarchically</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">4. Compliance Check:</span>
            <span>Compare actual resource config vs. desired config and report differences</span>
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
