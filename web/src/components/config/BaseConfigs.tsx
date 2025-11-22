import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Save, FileText, Eye } from 'lucide-react';
import { getTemplatesForResourceType, getSupportedResourceTypes } from '@/lib/baseConfigTemplates';
import { getBaseConfigs, createBaseConfig, deleteBaseConfig, BaseConfig, getTemplatesByResourceType, createTemplate, ConfigTemplate } from '@/api';

const AWS_RESOURCE_TYPES = getSupportedResourceTypes();

export default function BaseConfigs() {
  const [configs, setConfigs] = useState<BaseConfig[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [configJson, setConfigJson] = useState<string>('{}');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BaseConfig | null>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [customTemplates, setCustomTemplates] = useState<ConfigTemplate[]>([]);
  const [viewingConfig, setViewingConfig] = useState<BaseConfig | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    if (selectedType) {
      loadCustomTemplates(selectedType);
    }
  }, [selectedType]);

  const loadConfigs = async () => {
    try {
      const data = await getBaseConfigs();
      setConfigs(data.configs || []);
    } catch (error) {
      console.error('Failed to load base configs:', error);
    }
  };

  const loadCustomTemplates = async (resourceType: string) => {
    try {
      const data = await getTemplatesByResourceType(resourceType);
      const custom = data.templates.filter((t: ConfigTemplate) => t.is_custom);
      setCustomTemplates(custom);
    } catch (error) {
      console.error('Failed to load custom templates:', error);
    }
  };

  // Group configs by AWS service (e.g., aws_ec2, aws_s3)
  const groupedConfigs = configs.reduce((acc, config) => {
    const parts = config.resource_type.split('_');
    const service = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : config.resource_type;
    if (!acc[service]) {
      acc[service] = [];
    }
    acc[service].push(config);
    return acc;
  }, {} as Record<string, BaseConfig[]>);

  const handleCreate = () => {
    setEditingConfig(null);
    setSelectedType('');
    setSelectedTemplate('');
    setConfigJson('{\n  \n}');
    setSaveAsTemplate(false);
    setTemplateName('');
    setTemplateDescription('');
    setIsDialogOpen(true);
  };

  const handleEdit = (config: BaseConfig) => {
    setEditingConfig(config);
    setSelectedType(config.resource_type);
    setSelectedTemplate('');
    setConfigJson(JSON.stringify(config.desired_config, null, 2));
    setSaveAsTemplate(false);
    setTemplateName('');
    setTemplateDescription('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      // Validate JSON first
      let desiredConfig;
      try {
        desiredConfig = JSON.parse(configJson);
      } catch (jsonError) {
        alert('Invalid JSON format. Please check your configuration syntax.');
        return;
      }
      
      // Save as template if checkbox is checked
      if (saveAsTemplate && templateName) {
        try {
          await createTemplate({
            name: templateName,
            resource_type: selectedType,
            description: templateDescription,
            desired_config: desiredConfig,
            category: 'custom'
          });
        } catch (error) {
          console.error('Failed to save template:', error);
          alert('Failed to save template. The base config will still be saved.');
        }
      }
      
      // Save the config
      await createBaseConfig({
        resource_type: selectedType,
        desired_config: desiredConfig,
      });

      setIsDialogOpen(false);
      loadConfigs();
      if (saveAsTemplate) {
        loadCustomTemplates(selectedType);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save configuration: ${errorMessage}`);
    }
  };

  const handleDelete = async (resourceType: string) => {
    if (!confirm(`Delete base config for ${resourceType}?`)) return;

    try {
      await deleteBaseConfig(resourceType);
      loadConfigs();
    } catch (error) {
      console.error('Failed to delete config:', error);
    }
  };

  const handleTemplateChange = (templateIndex: string) => {
    setSelectedTemplate(templateIndex);
    if (templateIndex && selectedType) {
      // Check if it's a custom template (starts with 'custom-')
      if (templateIndex.startsWith('custom-')) {
        const customIndex = parseInt(templateIndex.replace('custom-', ''));
        const template = customTemplates[customIndex];
        if (template) {
          setConfigJson(JSON.stringify(template.desired_config, null, 2));
        }
      } else {
        // Built-in template
        const templates = getTemplatesForResourceType(selectedType);
        const template = templates[parseInt(templateIndex)];
        if (template) {
          // Built-in templates use 'config' property, not 'desired_config'
          setConfigJson(JSON.stringify(template.config, null, 2));
        }
      }
    }
  };

  const availableTemplates = selectedType ? getTemplatesForResourceType(selectedType) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Base Configurations</CardTitle>
              <CardDescription>
                Define the desired configuration for all resources of each type
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Base Config
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No base configurations yet.</p>
              <p className="text-sm mt-2">Create your first base config to get started.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {Object.entries(groupedConfigs).map(([service, serviceConfigs]) => (
                <AccordionItem key={service} value={service} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold text-lg font-mono">{service}</span>
                      <Badge variant="secondary" className="ml-2">
                        {serviceConfigs.length} {serviceConfigs.length === 1 ? 'config' : 'configs'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {serviceConfigs.map((config) => (
                        <Card key={config.resource_type} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base font-mono">
                                  {config.resource_type}
                                </CardTitle>
                                <CardDescription className="mt-1 text-xs">
                                  Last updated: {new Date(config.updated_at).toLocaleString()}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setViewingConfig(config);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(config)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {config.editable && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(config.resource_type)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Base Configuration' : 'New Base Configuration'}
            </DialogTitle>
            <DialogDescription>
              Define the desired configuration that all resources of this type should have
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resource-type">Resource Type</Label>
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  setSelectedType(value);
                  setSelectedTemplate('');
                }}
                disabled={!!editingConfig}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resource type" />
                </SelectTrigger>
                <SelectContent>
                  {AWS_RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType && (availableTemplates.length > 0 || customTemplates.length > 0) && (
              <div className="space-y-2">
                <Label htmlFor="template">Load from Template (Optional)</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template or write custom config..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((template, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {template.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    {customTemplates.length > 0 && (
                      <>
                        {availableTemplates.length > 0 && (
                          <div className="border-t my-1" />
                        )}
                        {customTemplates.map((template, index) => (
                          <SelectItem key={`custom-${index}`} value={`custom-${index}`}>
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{template.name}</span>
                                  <Badge variant="outline" className="text-xs">Custom</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {template.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">Template loaded</Badge>
                    You can modify the configuration below
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="desired-config">Desired Configuration (JSON)</Label>
              <Textarea
                id="desired-config"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="font-mono text-sm min-h-[400px]"
                placeholder="{\n  &quot;PropertyName&quot;: &quot;value&quot;\n}"
              />
              <p className="text-xs text-muted-foreground">
                {selectedTemplate
                  ? 'Template loaded above - modify as needed'
                  : 'Enter the exact AWS resource configuration properties you want all resources of this type to have'}
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-as-template"
                  checked={saveAsTemplate}
                  onCheckedChange={(checked) => setSaveAsTemplate(checked as boolean)}
                />
                <Label
                  htmlFor="save-as-template"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Save as reusable template
                </Label>
              </div>
              
              {saveAsTemplate && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Production S3 Security"
                      className="max-w-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Input
                      id="template-description"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="e.g., Secure S3 bucket with encryption and public access blocking"
                      className="max-w-md"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This template will be available in the template dropdown for this resource type
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedType}>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {viewingConfig?.resource_type}
            </DialogTitle>
            <DialogDescription>
              Base configuration for this resource type
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md">
            <pre className="text-sm overflow-x-auto">
              {viewingConfig && JSON.stringify(viewingConfig.desired_config, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
