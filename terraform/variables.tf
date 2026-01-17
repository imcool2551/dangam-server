variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "aws_profile" {
  description = "AWS CLI profile name"
  type        = string
  default     = "dangam"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "dangam-server"
}

# EC2
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro" # Free tier eligible
}

variable "key_name" {
  description = "EC2 key pair name for SSH access"
  type        = string
}

# Route53
variable "domain_name" {
  description = "Domain name (e.g., growdangams.com)"
  type        = string
}

variable "subdomain" {
  description = "Subdomain for API (e.g., api for api.growdangams.com)"
  type        = string
  default     = "api"
}

# Application
variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3000
}

variable "node_version" {
  description = "Node.js version"
  type        = string
  default     = "20"
}

# ============================================
# SSM Parameter Store Variables (Secrets)
# ============================================

variable "db_uri" {
  description = "MongoDB connection string"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "kakao_rest_api_key" {
  description = "Kakao REST API key"
  type        = string
  sensitive   = true
}

variable "firebase_service_account" {
  description = "Firebase service account JSON (stringified)"
  type        = string
  sensitive   = true
}

variable "github_deploy_key" {
  description = "GitHub deploy key (private key for git clone)"
  type        = string
  sensitive   = true
}

variable "aws_s3_bucket_name" {
  description = "S3 bucket name for file uploads"
  type        = string
  default     = "dangam-diary"
}

# ============================================
# Monitoring & Alerts
# ============================================

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "imcool2551@gmail.com"
}

variable "billing_threshold" {
  description = "Monthly billing threshold in USD for alerts"
  type        = number
  default     = 30
}

variable "error_threshold" {
  description = "Error count threshold for alerts (per 5 minutes)"
  type        = number
  default     = 5
}
