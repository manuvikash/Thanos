# DynamoDB table for customers
resource "aws_dynamodb_table" "customers" {
  name         = "${local.name_prefix}-customers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenant_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-customers"
  })
}

# ============================================================================
# PRODUCTION INFRASTRUCTURE - COMMENTED OUT FOR LOCAL DEV TESTING
# Uncomment these resources when ready to deploy to production
# See PRODUCTION_DEPLOYMENT.md for details
# ============================================================================

# # S3 bucket for Customer Portal
# resource "aws_s3_bucket" "customer_portal" {
#   bucket = "${local.name_prefix}-customer-portal-${random_id.suffix.hex}"
#
#   tags = merge(local.common_tags, {
#     Name = "${local.name_prefix}-customer-portal"
#   })
# }
#
# resource "aws_s3_bucket_public_access_block" "customer_portal" {
#   bucket = aws_s3_bucket.customer_portal.id
#
#   block_public_acls       = false
#   block_public_policy     = false
#   ignore_public_acls      = false
#   restrict_public_buckets = false
# }
#
# resource "aws_s3_bucket_website_configuration" "customer_portal" {
#   bucket = aws_s3_bucket.customer_portal.id
#
#   index_document {
#     suffix = "index.html"
#   }
#
#   error_document {
#     key = "index.html"
#   }
# }
#
# resource "aws_s3_bucket_policy" "customer_portal" {
#   bucket = aws_s3_bucket.customer_portal.id
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid       = "PublicReadGetObject"
#         Effect    = "Allow"
#         Principal = "*"
#         Action    = "s3:GetObject"
#         Resource  = "${aws_s3_bucket.customer_portal.arn}/*"
#       }
#     ]
#   })
#
#   depends_on = [aws_s3_bucket_public_access_block.customer_portal]
# }
#
# # CloudFront distribution for Customer Portal
# resource "aws_cloudfront_distribution" "customer_portal" {
#   enabled             = true
#   default_root_object = "index.html"
#   price_class         = "PriceClass_100"
#
#   origin {
#     domain_name = aws_s3_bucket_website_configuration.customer_portal.website_endpoint
#     origin_id   = "S3-${aws_s3_bucket.customer_portal.id}"
#
#     custom_origin_config {
#       http_port              = 80
#       https_port             = 443
#       origin_protocol_policy = "http-only"
#       origin_ssl_protocols   = ["TLSv1.2"]
#     }
#   }
#
#   default_cache_behavior {
#     allowed_methods        = ["GET", "HEAD", "OPTIONS"]
#     cached_methods         = ["GET", "HEAD"]
#     target_origin_id       = "S3-${aws_s3_bucket.customer_portal.id}"
#     viewer_protocol_policy = "redirect-to-https"
#
#     forwarded_values {
#       query_string = false
#       cookies {
#         forward = "none"
#       }
#     }
#
#     min_ttl     = 0
#     default_ttl = 3600
#     max_ttl     = 86400
#   }
#
#   restrictions {
#     geo_restriction {
#       restriction_type = "none"
#     }
#   }
#
#   viewer_certificate {
#     cloudfront_default_certificate = true
#   }
#
#   tags = merge(local.common_tags, {
#     Name = "${local.name_prefix}-customer-portal-cdn"
#   })
# }
