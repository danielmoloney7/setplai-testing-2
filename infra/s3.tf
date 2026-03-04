resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# 2. The S3 bucket
resource "aws_s3_bucket" "media" {
  bucket = "setplai-media-${random_string.suffix.result}-${var.env}"
}

# 3. Block public access directly to the s3 bucket URLs
resource "aws_s3_bucket_public_access_block" "media_block" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 4. Allow CORS to React Native App can upload via presigned URLs
resource "aws_s3_bucket_cors_configuration" "media_cors" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# 5. S3 Bucket Policy allowing cloudfront to actually read the files
resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.media.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceARN" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}