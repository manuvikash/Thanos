import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getTemplates, createBaseConfig, ConfigTemplate } from '@/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function Templates() {
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<ConfigTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await getTemplates();
      setTemplates(response.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const copyToClipboard = (template: ConfigTemplate) => {
    const configJson = JSON.stringify(template.desired_config, null, 2);
    navigator.clipboard.writeText(configJson);
    setCopiedId(template.template_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const useAsBaseConfig = async (template: ConfigTemplate) => {
    try {
      await createBaseConfig({
        resource_type: template.resource_type,
        desired_config: template.desired_config,
      });
      toast.success(`Created base config for ${template.resource_type} using ${template.name} template`);
    } catch (error) {
      console.error('Failed to create base config:', error);
      toast.error('Failed to create base config');
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.resource_type]) {
      acc[template.resource_type] = [];
    }
    acc[template.resource_type].push(template);
    return acc;
  }, {} as Record<string, ConfigTemplate[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration Templates</CardTitle>
          <CardDescription>
            Pre-built configuration templates for common AWS resource types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No templates available.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {Object.entries(groupedTemplates).map(([resourceType, resourceTemplates]) => (
                <AccordionItem key={resourceType} value={resourceType} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold text-lg font-mono">{resourceType}</span>
                      <Badge variant="secondary" className="ml-2">
                        {resourceTemplates.length} {resourceTemplates.length === 1 ? 'template' : 'templates'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-3 md:grid-cols-2 pt-2">
                      {resourceTemplates.map((template) => (
                        <Card key={template.template_id} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-sm">{template.name}</CardTitle>
                                <CardDescription className="mt-1 text-xs">
                                  {template.description}
                                </CardDescription>
                              </div>
                              {template.is_custom && (
                                <Badge variant="outline" className="text-xs">Custom</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setViewingTemplate(template);
                                  setIsViewDialogOpen(true);
                                }}
                                className="flex-1"
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(template)}
                                className="flex-1"
                              >
                                {copiedId === template.template_id ? (
                                  <>
                                    <CheckCheck className="mr-1 h-3 w-3" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="mr-1 h-3 w-3" />
                                    Copy
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => useAsBaseConfig(template)}
                                className="flex-1"
                              >
                                Use
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingTemplate?.name}</DialogTitle>
            <DialogDescription>
              {viewingTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Resource Type</p>
              <code className="text-sm bg-muted px-2 py-1 rounded">{viewingTemplate?.resource_type}</code>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Configuration</p>
              <div className="bg-muted p-4 rounded-md">
                <pre className="text-sm overflow-x-auto">
                  {viewingTemplate && JSON.stringify(viewingTemplate.desired_config, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
