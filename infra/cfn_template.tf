# infra/cfn_template.tf

# This file publishes the CloudFormation template (customer-onboarding-role.yaml)
# to an S3 bucket so that our "Quick Create" URLs can use it.

# Optional: override this bucket name via TF variable if desired
variable "cfn_artifacts_bucket_name" {
  type    = string
  default = null
}

resource "aws_s3_bucket" "cfn_artifacts" {
  bucket        = coalesce(var.cfn_artifacts_bucket_name, "${var.project_prefix}-cfn-artifacts-${random_id.suffix.hex}")
  force_destroy = true
  tags          = { Name = "${var.project_prefix}-cfn-artifacts" }
}

# Upload our CloudFormation template
resource "aws_s3_object" "onboarding_role_template" {
  bucket       = aws_s3_bucket.cfn_artifacts.id
  key          = "customer-onboarding-role.yaml"
  source       = "${path.module}/../cfn/customer-onboarding-role.yaml"
  etag         = filemd5("${path.module}/../cfn/customer-onboarding-role.yaml")
  content_type = "text/yaml"
}

# Allow public read so AWS Console Quick Create can fetch it (safe since no secrets)

# NOTE: We do NOT create a public bucket policy here because many AWS
# accounts enforce Block Public Access at the account level which prevents
# attaching public bucket policies (causes AccessDenied during apply).
# The onboarding lambda will generate a presigned URL for the template
# instead of relying on a public bucket policy.

# Capture the URL of this template
output "onboarding_template_url" {
  value = "https://${aws_s3_bucket.cfn_artifacts.bucket}.s3.amazonaws.com/${aws_s3_object.onboarding_role_template.key}"
}

# Output your Thanos AWS Account ID (needed for the TrustedAccountId param)
data "aws_caller_identity" "this" {}

output "trusted_account_id" {
  value = data.aws_caller_identity.this.account_id
}
