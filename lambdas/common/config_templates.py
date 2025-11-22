"""
Configuration templates for common AWS resource types.
"""
from typing import Dict, Any, List
from .config_models import ConfigTemplate


# S3 Bucket Templates
S3_SECURE_TEMPLATE = ConfigTemplate(
    template_id="s3-secure-baseline",
    name="S3 Secure Baseline",
    resource_type="AWS::S3::Bucket",
    description="Basic security configuration for S3 buckets with public access blocked and AES256 encryption",
    category="security",
    desired_config={
        "PublicAccessBlockConfiguration": {
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True
        },
        "ServerSideEncryptionConfiguration": {
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                },
                "BucketKeyEnabled": True
            }]
        }
    }
)

S3_PRODUCTION_TEMPLATE = ConfigTemplate(
    template_id="s3-production",
    name="S3 Production Configuration",
    resource_type="AWS::S3::Bucket",
    description="Production-grade S3 configuration with KMS encryption, versioning, and lifecycle policies",
    category="security",
    desired_config={
        "PublicAccessBlockConfiguration": {
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True
        },
        "ServerSideEncryptionConfiguration": {
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "aws:kms"
                },
                "BucketKeyEnabled": True
            }]
        },
        "VersioningConfiguration": {
            "Status": "Enabled"
        },
        "LifecycleConfiguration": {
            "Rules": [{
                "Status": "Enabled",
                "Transitions": [{
                    "Days": 90,
                    "StorageClass": "GLACIER"
                }]
            }]
        }
    }
)

# IAM Policy Templates
IAM_LEAST_PRIVILEGE_TEMPLATE = ConfigTemplate(
    template_id="iam-least-privilege",
    name="IAM Least Privilege Policy",
    resource_type="AWS::IAM::Policy",
    description="IAM policy template enforcing least privilege - no wildcard actions or sensitive operations",
    category="security",
    desired_config={
        "PolicyDocument": {
            "Version": "2012-10-17",
            "Statement": []
        }
    }
)

# Security Group Templates
SG_RESTRICTED_TEMPLATE = ConfigTemplate(
    template_id="sg-restricted",
    name="Security Group - Restricted Access",
    resource_type="AWS::EC2::SecurityGroup",
    description="Security group with no SSH/RDP from internet, restricted to internal networks",
    category="security",
    desired_config={
        "IpPermissions": []
    }
)

# EC2 Instance Templates
EC2_SECURE_TEMPLATE = ConfigTemplate(
    template_id="ec2-secure-baseline",
    name="EC2 Secure Baseline",
    resource_type="AWS::EC2::Instance",
    description="Secure EC2 instance configuration with IMDSv2, EBS encryption, and monitoring",
    category="security",
    desired_config={
        "MetadataOptions": {
            "HttpTokens": "required",
            "HttpPutResponseHopLimit": 1
        },
        "Monitoring": {
            "State": "enabled"
        }
    }
)

# RDS Instance Templates
RDS_SECURE_TEMPLATE = ConfigTemplate(
    template_id="rds-secure-baseline",
    name="RDS Secure Baseline",
    resource_type="AWS::RDS::DBInstance",
    description="Secure RDS configuration with encryption, automated backups, and private access",
    category="security",
    desired_config={
        "StorageEncrypted": True,
        "BackupRetentionPeriod": 7,
        "PubliclyAccessible": False,
        "EnableCloudwatchLogsExports": ["error", "general", "slowquery"],
        "DeletionProtection": True
    }
)

# Lambda Function Templates
LAMBDA_SECURE_TEMPLATE = ConfigTemplate(
    template_id="lambda-secure-baseline",
    name="Lambda Secure Baseline",
    resource_type="AWS::Lambda::Function",
    description="Secure Lambda configuration with environment encryption and VPC access",
    category="security",
    desired_config={
        "TracingConfig": {
            "Mode": "Active"
        },
        "Environment": {
            "Variables": {}
        }
    }
)


# Template Registry
TEMPLATE_REGISTRY: Dict[str, ConfigTemplate] = {
    template.template_id: template
    for template in [
        S3_SECURE_TEMPLATE,
        S3_PRODUCTION_TEMPLATE,
        IAM_LEAST_PRIVILEGE_TEMPLATE,
        SG_RESTRICTED_TEMPLATE,
        EC2_SECURE_TEMPLATE,
        RDS_SECURE_TEMPLATE,
        LAMBDA_SECURE_TEMPLATE
    ]
}


def get_templates_by_resource_type(resource_type: str) -> List[ConfigTemplate]:
    """Get all templates for a specific resource type."""
    return [
        template for template in TEMPLATE_REGISTRY.values()
        if template.resource_type == resource_type
    ]


def get_template(template_id: str) -> ConfigTemplate:
    """Get a specific template by ID."""
    return TEMPLATE_REGISTRY.get(template_id)


def list_all_templates() -> List[ConfigTemplate]:
    """Get all available templates."""
    return list(TEMPLATE_REGISTRY.values())
