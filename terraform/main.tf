terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 backend for state management (optional - uncomment after creating bucket)
  # backend "s3" {
  #   bucket = "dangam-terraform-state"
  #   key    = "prod/terraform.tfstate"
  #   region = "ap-northeast-2"
  # }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "dangam-server"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# US East 1 provider for billing metrics (billing is only available in us-east-1)
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = "dangam-server"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
