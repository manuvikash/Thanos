import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { verifyAndRegisterCustomer, getPublicConfig } from '../api';
import { RegistrationHeader } from '../components/registration/RegistrationHeader';

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'sa-east-1',
];

// Note: We use S3 with region-agnostic endpoint (s3.amazonaws.com) so it works across all regions

export default function CustomerOnboarding() {
  const [accountId, setAccountId] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [config, setConfig] = useState<{ trusted_account_id: string; cloudformation_template_url: string } | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const publicConfig = await getPublicConfig();
        setConfig(publicConfig);
      } catch (error) {
        console.error('Failed to fetch public config:', error);
      }
    };
    fetchConfig();
  }, []);

  const handleCreateRole = () => {
    // Validate account ID
    if (!/^\d{12}$/.test(accountId)) {
      alert('Please enter a valid 12-digit AWS Account ID');
      return;
    }

    // Validate configuration
    if (!config?.trusted_account_id) {
      alert('Trusted account ID is not configured. Please check your environment configuration.');
      return;
    }

    if (!config?.cloudformation_template_url) {
      alert('CloudFormation template URL is not configured. Please check your environment configuration.');
      return;
    }

    // Build the CloudFormation console URL with S3 template URL
    // Using region-agnostic S3 endpoint (s3.amazonaws.com) works across all regions
    const cfnUrl = `https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?stackName=CloudGoldenGuardAuditRole&templateURL=${encodeURIComponent(config.cloudformation_template_url)}&param_TrustedAccountId=${config.trusted_account_id}`;

    // Open in new tab
    window.open(cfnUrl, '_blank');
  };

  const handleVerifyAndSave = async () => {
    // Validate account ID
    if (!/^\d{12}$/.test(accountId)) {
      setVerificationStatus({
        success: false,
        message: 'Please enter a valid 12-digit AWS Account ID',
      });
      return;
    }

    if (!region) {
      setVerificationStatus({
        success: false,
        message: 'Please select a region',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus(null);

    try {
      const result = await verifyAndRegisterCustomer({
        account_id: accountId,
        regions: [region],
      });

      setVerificationStatus({
        success: true,
        message: `Successfully registered customer! Tenant ID: ${result.tenant_id}`,
      });

      // Reset form after success
      setTimeout(() => {
        setAccountId('');
        setRegion('us-east-1');
        setVerificationStatus(null);
      }, 5000);
    } catch (error) {
      setVerificationStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed. Please ensure the CloudFormation stack was created successfully.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <RegistrationHeader />

      <div className="relative z-10 flex items-center justify-center p-6 pt-12">
        <div className="w-full max-w-4xl">
          {/* Main Card */}
          <Card className="border-2">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold">Onboard New Customer</CardTitle>
              <CardDescription className="text-base">
              Connect your AWS account to get started with security scanning and compliance monitoring.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Connect AWS Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Connect AWS</h3>

              {/* AWS Account ID Input */}
              <div className="space-y-2">
                <Label htmlFor="account-id" className="text-base">
                  AWS Account ID
                </Label>
                <Input
                  id="account-id"
                  type="text"
                  placeholder="123456789012"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  maxLength={12}
                  className="text-lg h-12"
                />
              </div>

              {/* Region Selector */}
              <div className="space-y-2">
                <Label htmlFor="region" className="text-base">
                  Region
                </Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger id="region" className="h-12 text-base">
                    <SelectValue placeholder="Select the AWS region for this customer account" />
                  </SelectTrigger>
                  <SelectContent>
                    {AWS_REGIONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-base">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select the AWS region for this customer account.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={handleCreateRole}
                  disabled={!accountId || accountId.length !== 12}
                  className="flex-1 h-12 text-base bg-cyan-600 hover:bg-cyan-700"
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Create Role via CloudFormation
                </Button>

                <Button
                  onClick={handleVerifyAndSave}
                  disabled={!accountId || accountId.length !== 12 || isVerifying}
                  variant="outline"
                  className="flex-1 h-12 text-base"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      I created the role → Verify & Save
                    </>
                  )}
                </Button>
              </div>

              {/* Verification Status */}
              {verificationStatus && (
                <div
                  className={`p-4 rounded-md flex items-start gap-3 ${
                    verificationStatus.success
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  {verificationStatus.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0">✕</div>
                  )}
                  <p
                    className={`text-sm ${
                      verificationStatus.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {verificationStatus.message}
                  </p>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-6 p-4 bg-muted rounded-md">
                <h4 className="font-semibold mb-2">How it works:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Enter your AWS Account ID and select the region</li>
                  <li>Click "Create Role via CloudFormation" to open AWS Console</li>
                  <li>Sign in to your AWS account and create the CloudFormation stack</li>
                  <li>After stack creation is complete, click "Verify & Save" to register your account</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            The IAM role grants read-only access for security auditing.{' '}
            <a
              href="https://github.com/manuvikash/Thanos/blob/main/infra/customer-onboarding-role.yaml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-500 hover:underline"
            >
              View template
            </a>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
