# SSM Parameter Store for environment variables
# These will store your application secrets securely

resource "aws_ssm_parameter" "db_uri" {
  name        = "/${var.project_name}/${var.environment}/DB_URI"
  description = "MongoDB connection string"
  type        = "SecureString"
  value       = var.db_uri

  tags = {
    Name = "${var.project_name}-db-uri"
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/${var.environment}/JWT_SECRET"
  description = "JWT secret key"
  type        = "SecureString"
  value       = var.jwt_secret

  tags = {
    Name = "${var.project_name}-jwt-secret"
  }
}

resource "aws_ssm_parameter" "kakao_rest_api_key" {
  name        = "/${var.project_name}/${var.environment}/KAKAO_REST_API_KEY"
  description = "Kakao REST API key"
  type        = "SecureString"
  value       = var.kakao_rest_api_key

  tags = {
    Name = "${var.project_name}-kakao-key"
  }
}

resource "aws_ssm_parameter" "firebase_service_account" {
  name        = "/${var.project_name}/${var.environment}/FIREBASE_SERVICE_ACCOUNT"
  description = "Firebase service account JSON"
  type        = "SecureString"
  value       = var.firebase_service_account

  tags = {
    Name = "${var.project_name}-firebase-sa"
  }
}

resource "aws_ssm_parameter" "aws_s3_bucket_name" {
  name        = "/${var.project_name}/${var.environment}/AWS_S3_BUCKET_NAME"
  description = "S3 bucket name"
  type        = "String"
  value       = var.aws_s3_bucket_name

  tags = {
    Name = "${var.project_name}-s3-bucket"
  }
}

resource "aws_ssm_parameter" "cloudfront_domain" {
  name        = "/${var.project_name}/${var.environment}/CLOUDFRONT_DOMAIN"
  description = "CloudFront distribution domain"
  type        = "String"
  value       = aws_cloudfront_distribution.s3_distribution.domain_name

  tags = {
    Name = "${var.project_name}-cloudfront-domain"
  }
}

# Note: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# are not needed if EC2 uses IAM Role for S3 access (recommended)
