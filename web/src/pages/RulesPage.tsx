import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Rule, getRules, deleteRule } from '@/api'
import { useToast } from '@/hooks/useToast'
import { RuleDialog } from '@/components/rules/RuleDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const { showToast } = useToast()

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await getRules()
      setRules(response.rules)
    } catch (error) {
      showToast('Failed to load rules', 'error')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  const handleCreate = () => {
    setSelectedRule(null)
    setShowDialog(true)
  }

  const handleEdit = (rule: Rule) => {
    if (!rule.editable) {
      showToast('This is a system default rule and cannot be edited. You can disable it or create a custom override.', 'warning')
      return
    }
    setSelectedRule(rule)
    setShowDialog(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    if (!deleteTarget.editable) {
      showToast('System default rules cannot be deleted. You can disable them instead.', 'warning')
      setDeleteTarget(null)
      return
    }

    try {
      await deleteRule(deleteTarget.id, deleteTarget.tenant_id)
      showToast('Rule deleted successfully', 'success')
      loadRules()
    } catch (error) {
      showToast('Failed to delete rule', 'error')
      console.error(error)
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleDialogClose = (updated: boolean) => {
    setShowDialog(false)
    setSelectedRule(null)
    if (updated) {
      loadRules()
    }
  }

  // Filtering
  const filteredRules = rules.filter((rule) => {
    if (categoryFilter !== 'all' && rule.category !== categoryFilter) return false
    if (resourceTypeFilter !== 'all' && rule.resource_type !== resourceTypeFilter) return false
    if (sourceFilter !== 'all' && rule.source !== sourceFilter) return false
    return true
  })

  const availableResourceTypes = Array.from(new Set(rules.map(r => r.resource_type))).sort()
  const availableCategories = Array.from(new Set(rules.map(r => r.category))).sort()

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'compliance':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Compliance</Badge>
      case 'type-golden':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Golden Config</Badge>
      case 'instance-golden':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Critical Golden Config</Badge>
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
      HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    }
    return <Badge variant="outline" className={variants[severity] || ''}>{severity}</Badge>
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'default':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Default</Badge>
      case 'custom':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Custom</Badge>
      case 'global':
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Global</Badge>
      default:
        return <Badge variant="outline">{source}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>Loading rules...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rules Management</CardTitle>
              <CardDescription>
                Manage compliance and golden config rules. Default rules cannot be edited or deleted.
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'compliance' ? 'Compliance' : cat === 'type-golden' ? 'Golden Config' : 'Critical Golden Config'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Resource Type</label>
              <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Resource Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resource Types</SelectItem>
                  {availableResourceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rules Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No rules match the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRules.map((rule) => (
                    <TableRow key={`${rule.source}-${rule.id}`}>
                      <TableCell className="font-mono text-sm">{rule.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {rule.resource_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCategoryBadge(rule.category)}</TableCell>
                      <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                      <TableCell>{getSourceBadge(rule.source)}</TableCell>
                      <TableCell className="max-w-md truncate">{rule.message}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rule)}
                            disabled={!rule.editable}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(rule)}
                            disabled={!rule.editable}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredRules.length} of {rules.length} rules
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      {showDialog && (
        <RuleDialog
          rule={selectedRule}
          open={showDialog}
          onClose={handleDialogClose}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rule "{deleteTarget?.id}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
