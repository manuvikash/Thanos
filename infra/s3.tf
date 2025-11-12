# S3 bucket for snapshots
resource "aws_s3_bucket" "snapshots" {
  bucket = "${local.name_prefix}-snapshots-${random_id.suffix.hex}"
  
  tags = merge(local.common_tags, {
    Name = "Snapshots Bucket"
  })
}

resource "aws_s3_bucket_versioning" "snapshots" {
  bucket = aws_s3_bucket.snapshots.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "snapshots" {
  bucket = aws_s3_bucket.snapshots.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "snapshots" {
  bucket = aws_s3_bucket.snapshots.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket for web hosting
resource "aws_s3_bucket" "web" {
  bucket = "${local.name_prefix}-web-${random_id.suffix.hex}"
  
  tags = merge(local.common_tags, {
    Name = "Web Hosting Bucket"
  })
}

resource "aws_s3_bucket_website_configuration" "web" {
  bucket = aws_s3_bucket.web.id
  
  index_document {
    suffix = "index.html"
  }
  
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id
  
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.web.arn}/*"
      }
    ]
  })
  
  depends_on = [aws_s3_bucket_public_access_block.web]
}

# Optional: S3 bucket for rules (can use snapshots bucket or separate)
resource "aws_s3_bucket" "rules" {
  bucket = "${local.name_prefix}-rules-${random_id.suffix.hex}"
  
  tags = merge(local.common_tags, {
    Name = "Rules Bucket"
  })
}

resource "aws_s3_bucket_versioning" "rules" {
  bucket = aws_s3_bucket.rules.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "rules" {
  bucket = aws_s3_bucket.rules.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
