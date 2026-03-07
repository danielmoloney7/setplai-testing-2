output "cloudfront_url" {
  description = "The Base URL for your videos and Images"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket to upload to"
  value       = aws_s3_bucket.media.bucket
}

output "database_endpoint" {
  description = "The connection endpoint for the PostgreSQL database"
  value       = aws_db_instance.postgres.endpoint
}