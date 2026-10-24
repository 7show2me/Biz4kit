terraform {
  # 1.10+ for S3-native state locking (use_lockfile), D39.
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Bucket comes from -backend-config (see README); key per environment from
  # backend/<environment>.hcl.
  backend "s3" {}
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      project     = "biz4kit"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}
