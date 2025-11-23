/**
 * Base configuration templates for AWS resources
 */

interface ConfigTemplate {
  name: string;
  description: string;
  config: Record<string, any>;
}

/**
 * Predefined templates for common AWS resource types
 */
const RESOURCE_TEMPLATES: Record<string, ConfigTemplate[]> = {
  'AWS::S3::Bucket': [
    {
      name: 'Basic Bucket',
      description: 'Standard S3 bucket configuration',
      config: {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      },
    },
  ],
  'AWS::EC2::Instance': [
    {
      name: 'Basic Instance',
      description: 'Standard EC2 instance configuration',
      config: {
        Monitoring: {
          State: 'enabled',
        },
        EbsOptimized: true,
        MetadataOptions: {
          HttpTokens: 'required',
          HttpPutResponseHopLimit: 1,
        },
      },
    },
  ],
  'AWS::RDS::DBInstance': [
    {
      name: 'Basic RDS',
      description: 'Standard RDS instance configuration',
      config: {
        StorageEncrypted: true,
        BackupRetentionPeriod: 7,
        PubliclyAccessible: false,
        EnableCloudwatchLogsExports: ['error', 'general', 'slowquery'],
      },
    },
  ],
  'AWS::Lambda::Function': [
    {
      name: 'Basic Lambda',
      description: 'Standard Lambda function configuration',
      config: {
        TracingConfig: {
          Mode: 'Active',
        },
        Environment: {
          Variables: {},
        },
      },
    },
  ],
  'AWS::IAM::Role': [
    {
      name: 'Basic Role',
      description: 'Standard IAM role configuration',
      config: {
        MaxSessionDuration: 3600,
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [],
        },
      },
    },
  ],
};

/**
 * List of supported AWS resource types
 */
const SUPPORTED_RESOURCE_TYPES = [
  'AWS::S3::Bucket',
  'AWS::EC2::Instance',
  'AWS::RDS::DBInstance',
  'AWS::Lambda::Function',
  'AWS::IAM::Role',
  'AWS::EC2::SecurityGroup',
  'AWS::EC2::VPC',
  'AWS::DynamoDB::Table',
  'AWS::CloudWatch::Alarm',
  'AWS::SNS::Topic',
  'AWS::SQS::Queue',
  'AWS::KMS::Key',
];

/**
 * Get available templates for a specific resource type
 */
export function getTemplatesForResourceType(resourceType: string): ConfigTemplate[] {
  return RESOURCE_TEMPLATES[resourceType] || [];
}

/**
 * Get list of all supported resource types
 */
export function getSupportedResourceTypes(): string[] {
  return SUPPORTED_RESOURCE_TYPES;
}
