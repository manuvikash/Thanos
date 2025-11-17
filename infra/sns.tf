# sns.tf
resource "aws_sns_topic" "critical_findings_alerts" {
  name = "${local.name_prefix}-critical-findings"
  tags = local.common_tags
}

# Optional: subscribe an email address (must be confirmed by the recipient)
variable "alert_email" {
  description = "Email to receive high-severity finding alerts via SNS"
  type        = string
  default     = ""
}

resource "aws_sns_topic_subscription" "critical_findings_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.critical_findings_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

output "alerts_topic_arn" {
  value = aws_sns_topic.critical_findings_alerts.arn
}

