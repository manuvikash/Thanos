import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Save, Tag } from 'lucide-react';
import { 
  getResourceGroups, 
  createResourceGroup, 
  updateResourceGroup, 
  deleteResourceGroup,
  ResourceGroup 
} from '@/api';

const AWS_RESOURCE_TYPES = [
  'AWS::S3::Bucket',
  'AWS::EC2::Instance',
  'AWS::RDS::DBInstance',
  'AWS::Lambda::Function',
  'AWS::EC2::SecurityGroup',
  'AWS::IAM::Role',
  'AWS::IAM::Policy',
];

export default function ResourceGroups() {
  const [groups, setGroups] = useState<ResourceGroup[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ResourceGroup | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('100');
  const [tags, setTags] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }]);
  const [arnPattern, setArnPattern] = useState('');
  const [namePattern, setNamePattern] = useState('');
  const [configJson, setConfigJson] = useState('{\n  \n}');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await getResourceGroups();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleCreate = () => {
    setEditingGroup(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (group: ResourceGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setResourceType(group.resource_type);
    setDescription(group.description);
    setPriority(group.priority.toString());
    
    // Load tags
    if (group.selector.tags) {
      setTags(
        Object.entries(group.selector.tags).map(([key, value]) => ({ key, value }))
      );
    } else {
      setTags([{ key: '', value: '' }]);
    }
    
    setArnPattern(group.selector.arn_pattern || '');
    setNamePattern(group.selector.name_pattern || '');
    setConfigJson(JSON.stringify(group.desired_config, null, 2));
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setName('');
    setResourceType('');
    setDescription('');
    setPriority('100');
    setTags([{ key: '', value: '' }]);
    setArnPattern('');
    setNamePattern('');
    setConfigJson('{\n  \n}');
  };

  const handleSave = async () => {
    try {
      const desiredConfig = JSON.parse(configJson);
      
      // Build selector
      const selector: any = {};
      const validTags = tags.filter(t => t.key && t.value);
      if (validTags.length > 0) {
        selector.tags = Object.fromEntries(validTags.map(t => [t.key, t.value]));
      }
      if (arnPattern) selector.arn_pattern = arnPattern;
      if (namePattern) selector.name_pattern = namePattern;

      const payload = {
        name,
        resource_type: resourceType,
        description,
        priority: parseInt(priority),
        selector,
        desired_config: desiredConfig,
      };

      if (editingGroup) {
        await updateResourceGroup(editingGroup.group_id, payload);
      } else {
        await createResourceGroup(payload);
      }

      setIsDialogOpen(false);
      loadGroups();
    } catch (error) {
      console.error('Failed to save group:', error);
      alert('Invalid JSON or save failed');
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Delete this resource group?')) return;

    try {
      await deleteResourceGroup(groupId);
      loadGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const addTag = () => {
    setTags([...tags, { key: '', value: '' }]);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, field: 'key' | 'value', value: string) => {
    const newTags = [...tags];
    newTags[index][field] = value;
    setTags(newTags);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resource Groups</CardTitle>
              <CardDescription>
                Group resources by tags or patterns and apply specific configurations
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Resource Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No resource groups yet.</p>
              <p className="text-sm mt-2">Create groups to apply configs to specific resources.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <Card key={group.group_id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <Badge variant="outline">Priority: {group.priority}</Badge>
                        </div>
                        <CardDescription className="mt-1">
                          <span className="font-mono text-xs">{group.resource_type}</span>
                        </CardDescription>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(group.group_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selector */}
                    <div>
                      <Label className="text-sm font-semibold">Selector</Label>
                      <div className="mt-2 space-y-2">
                        {group.selector.tags && (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(group.selector.tags).map(([key, value]) => (
                              <Badge key={key} variant="secondary">
                                <Tag className="h-3 w-3 mr-1" />
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {group.selector.arn_pattern && (
                          <div className="text-sm text-muted-foreground">
                            ARN pattern: <code className="bg-muted px-1">{group.selector.arn_pattern}</code>
                          </div>
                        )}
                        {group.selector.name_pattern && (
                          <div className="text-sm text-muted-foreground">
                            Name pattern: <code className="bg-muted px-1">{group.selector.name_pattern}</code>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Config */}
                    <div>
                      <Label className="text-sm font-semibold">Desired Configuration</Label>
                      <div className="mt-2 bg-muted p-4 rounded-md">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(group.desired_config, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Resource Group' : 'New Resource Group'}
            </DialogTitle>
            <DialogDescription>
              Define a group of resources and their desired configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production S3 Buckets"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource-type">Resource Type</Label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What makes this group special?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority (higher = more important)</Label>
              <Input
                id="priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground">
                Base config is 0. Higher priority groups override lower priority ones.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Selector - Match Resources By Tags</Label>
              {tags.map((tag, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Key (e.g., Environment)"
                    value={tag.key}
                    onChange={(e) => updateTag(index, 'key', e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g., production)"
                    value={tag.value}
                    onChange={(e) => updateTag(index, 'value', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeTag(index)}
                    disabled={tags.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tag
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arn-pattern">ARN Pattern (regex, optional)</Label>
                <Input
                  id="arn-pattern"
                  value={arnPattern}
                  onChange={(e) => setArnPattern(e.target.value)}
                  placeholder=".*:bucket/prod-.*"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name-pattern">Name Pattern (regex, optional)</Label>
                <Input
                  id="name-pattern"
                  value={namePattern}
                  onChange={(e) => setNamePattern(e.target.value)}
                  placeholder="prod-.*"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desired-config">Desired Configuration (JSON)</Label>
              <Textarea
                id="desired-config"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="font-mono text-sm min-h-[300px]"
                placeholder="{\n  &quot;Property&quot;: &quot;value&quot;\n}"
              />
              <p className="text-xs text-muted-foreground">
                This will be merged with the base config. You can add new properties or override existing ones.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name || !resourceType}>
              <Save className="mr-2 h-4 w-4" />
              Save Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
