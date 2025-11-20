import { useState, useEffect } from 'react'
import { Rule, RuleCreateRequest, createRule, updateRule } from '@/api'
import { useToast } from '@/hooks/useToast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface RuleDialogProps {
  rule: Rule | null
  open: boolean
  onClose: (updated: boolean) => void
}

export function RuleDialog({ rule, open, onClose }: RuleDialogProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [ruleId, setRuleId] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [category, setCategory] = useState<string>('compliance')
  const [severity, setSeverity] = useState<string>('MEDIUM')
  const [message, setMessage] = useState('')
  const [checkType, setCheckType] = useState<string>('equals')
  const [checkPath, setCheckPath] = useState('')
  const [expectedValue, setExpectedValue] = useState('')
  const [forbiddenValues, setForbiddenValues] = useState('')
  const [selector, setSelector] = useState('')
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (rule) {
      setRuleId(rule.id)
      setResourceType(rule.resource_type)
      setCategory(rule.category)
      setSeverity(rule.severity)
      setMessage(rule.message)
      setCheckType(rule.check.type)
      setCheckPath(rule.check.path)
      setExpectedValue(rule.check.expected !== undefined ? JSON.stringify(rule.check.expected) : '')
      setForbiddenValues(rule.check.forbidden ? rule.check.forbidden.join(',') : '')
      setSelector(JSON.stringify(rule.selector, null, 2))
      setEnabled(rule.enabled !== undefined ? rule.enabled : true)
    } else {
      // Reset for new rule
      setRuleId('')
      setResourceType('')
      setCategory('compliance')
      setSeverity('MEDIUM')
      setMessage('')
      setCheckType('equals')
      setCheckPath('')
      setExpectedValue('')
      setForbiddenValues('')
      setSelector('{}')
      setEnabled(true)
    }
  }, [rule])

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Parse expected value
      let expected: any = undefined
      if (expectedValue.trim()) {
        try {
          expected = JSON.parse(expectedValue)
        } catch {
          // Try as plain string if JSON parse fails
          expected = expectedValue
        }
      }

      // Parse forbidden values
      const forbidden = forbiddenValues.trim() ? forbiddenValues.split(',').map(v => v.trim()) : undefined

      // Parse selector
      let selectorObj = {}
      if (selector.trim() && selector.trim() !== '{}') {
        try {
          selectorObj = JSON.parse(selector)
        } catch (e) {
          showToast('Invalid selector JSON format', 'error')
          setLoading(false)
          return
        }
      }

      const ruleData: RuleCreateRequest = {
        id: ruleId || undefined,
        resource_type: resourceType,
        category,
        severity,
        message,
        check: {
          type: checkType,
          path: checkPath,
          expected,
          forbidden,
        },
        selector: selectorObj,
        enabled,
      }

      if (rule) {
        // Update existing rule
        await updateRule(rule.id, ruleData, rule.tenant_id)
        showToast('Rule updated successfully', 'success')
      } else {
        // Create new rule
        await createRule(ruleData)
        showToast('Rule created successfully', 'success')
      }

      onClose(true)
    } catch (error: any) {
      showToast(error.message || 'Failed to save rule', 'error')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Rule' : 'Create Custom Rule'}</DialogTitle>
          <DialogDescription>
            {rule ? 'Update the rule configuration' : 'Create a new custom rule. Custom rules override default rules with the same ID.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Rule ID */}
          <div className="grid gap-2">
            <Label htmlFor="rule-id">
              Rule ID {!rule && <span className="text-muted-foreground text-xs">(leave blank for auto-generated)</span>}
            </Label>
            <Input
              id="rule-id"
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              disabled={!!rule}
              placeholder="my-custom-rule"
            />
          </div>

          {/* Resource Type */}
          <div className="grid gap-2">
            <Label htmlFor="resource-type">Resource Type *</Label>
            <Input
              id="resource-type"
              value={resourceType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResourceType(e.target.value)}
              placeholder="AWS::S3::Bucket"
              required
            />
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="type-golden">Golden Config</SelectItem>
                <SelectItem value="instance-golden">Critical Golden Config</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="grid gap-2">
            <Label htmlFor="severity">Severity *</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="grid gap-2">
            <Label htmlFor="message">Message *</Label>
            <Input
              id="message"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
              placeholder="Describe what this rule checks"
              required
            />
          </div>

          {/* Check Type */}
          <div className="grid gap-2">
            <Label htmlFor="check-type">Check Type *</Label>
            <Select value={checkType} onValueChange={setCheckType}>
              <SelectTrigger id="check-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="forbidden-any">Forbidden Any</SelectItem>
                <SelectItem value="golden-config">Golden Config (Full Match)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Check Path */}
          <div className="grid gap-2">
            <Label htmlFor="check-path">Check Path *</Label>
            <Input
              id="check-path"
              value={checkPath}
              onChange={(e) => setCheckPath(e.target.value)}
              placeholder="PublicAccessBlockConfiguration.BlockPublicAcls"
              required
            />
          </div>

          {/* Expected Value (for equals and golden-config) */}
          {(checkType === 'equals' || checkType === 'golden-config') && (
            <div className="grid gap-2">
              <Label htmlFor="expected-value">
                Expected Value {checkType === 'equals' && '(JSON or plain text)'}
              </Label>
              <Textarea
                id="expected-value"
                value={expectedValue}
                onChange={(e) => setExpectedValue(e.target.value)}
                placeholder={checkType === 'golden-config' ? '{"key": "value", ...}' : 'true'}
                rows={3}
              />
            </div>
          )}

          {/* Forbidden Values (for forbidden-any) */}
          {checkType === 'forbidden-any' && (
            <div className="grid gap-2">
              <Label htmlFor="forbidden-values">Forbidden Values (comma-separated)</Label>
              <Input
                id="forbidden-values"
                value={forbiddenValues}
                onChange={(e) => setForbiddenValues(e.target.value)}
                placeholder="value1, value2, value3"
              />
            </div>
          )}

          {/* Selector (for instance-golden) */}
          {category === 'instance-golden' && (
            <div className="grid gap-2">
              <Label htmlFor="selector">Selector (JSON) - targets specific resources</Label>
              <Textarea
                id="selector"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                placeholder='{"tags": {"Environment": "production"}, "arn_pattern": ".*prod.*"}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Enabled */}
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !resourceType || !message || !checkPath}>
            {loading ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
