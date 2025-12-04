import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { getAlertConfig, updateAlertConfig, type AlertConfig } from '@/api';
import { Bell, Mail, Plus, X, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AlertsConfiguration() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({
    enabled: true,
    severity_levels: ['CRITICAL', 'HIGH'],
    email_addresses: [],
  });
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getAlertConfig();
      setConfig(data);
    } catch (error) {
      showToast('Failed to load alert configuration', 'error');
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAlertConfig(config);
      showToast('Alert configuration saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save alert configuration', 'error');
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSeverity = (severity: string) => {
    setConfig((prev) => {
      const levels = prev.severity_levels.includes(severity)
        ? prev.severity_levels.filter((s) => s !== severity)
        : [...prev.severity_levels, severity];
      return { ...prev, severity_levels: levels };
    });
  };

  const addEmail = () => {
    const email = newEmail.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (config.email_addresses.includes(email)) {
      showToast('Email already added', 'warning');
      return;
    }

    setConfig((prev) => ({
      ...prev,
      email_addresses: [...prev.email_addresses, email],
    }));
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    setConfig((prev) => ({
      ...prev,
      email_addresses: prev.email_addresses.filter((e) => e !== email),
    }));
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500 hover:bg-red-600';
      case 'HIGH':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'MEDIUM':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'LOW':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alert Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure SNS notifications for security findings
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Alert Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Alert Settings</CardTitle>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>
          <CardDescription>
            {config.enabled ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Alerts are enabled
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Alerts are disabled
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Trigger Alerts For These Severity Levels:
            </Label>
            <div className="flex gap-3 flex-wrap">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
                <Button
                  key={severity}
                  variant={
                    config.severity_levels.includes(severity) ? 'default' : 'outline'
                  }
                  className={
                    config.severity_levels.includes(severity)
                      ? getSeverityColor(severity)
                      : ''
                  }
                  onClick={() => toggleSeverity(severity)}
                >
                  {severity}
                  {config.severity_levels.includes(severity) && (
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Currently alerting on:{' '}
              {config.severity_levels.length > 0
                ? config.severity_levels.join(', ')
                : 'No severities selected'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Add email addresses to receive SNS notifications. Recipients must confirm their
            subscription via AWS SNS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Email Input */}
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="admin@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addEmail();
                }
              }}
            />
            <Button onClick={addEmail}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Email List */}
          <div className="space-y-2">
            <Label>Recipients ({config.email_addresses.length})</Label>
            {config.email_addresses.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
                No email addresses configured
              </div>
            ) : (
              <div className="space-y-2">
                {config.email_addresses.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                  >
                    <span className="text-sm font-mono">{email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmail(email)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SNS Info */}
          {config.sns_topic_arn && (
            <div className="pt-4 border-t">
              <Label className="text-xs text-muted-foreground">SNS Topic ARN</Label>
              <code className="block text-xs bg-muted p-2 rounded mt-1 break-all">
                {config.sns_topic_arn}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Email recipients must confirm their subscription via the SNS confirmation
                email sent by AWS.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                How Alerts Work
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Alerts are sent when findings match your selected severity levels</li>
                <li>Email notifications are delivered via AWS SNS</li>
                <li>New email recipients must confirm subscription via AWS email</li>
                <li>Changes take effect on the next scan</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {config.updated_at && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {new Date(config.updated_at).toLocaleString()}
          {config.updated_by && ` by ${config.updated_by}`}
        </div>
      )}
    </div>
  );
}
