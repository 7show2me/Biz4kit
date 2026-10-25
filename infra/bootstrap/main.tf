# Account-wide pieces, applied once by a person before the environments:
# the Terraform state bucket (D39), the shared image registry (D28) and the
# GitHub OIDC roles CI uses to deploy. See ../README.md.

terraform {
  required_version = ">= 1.10"

  # State lives in the bucket this stack creates (README step 1). Configure with
  # -backend-config: bucket, key=bootstrap.tfstate, region, use_lockfile, encrypt.
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      project    = "biz4kit"
      managed_by = "terraform"
    }
  }
}

variable "aws_profile" {
  description = "Local AWS CLI profile (never put keys in Terraform files)."
  type        = string
  default     = "biz4kit"
}

variable "aws_region" {
  description = "Mumbai (D28)."
  type        = string
  default     = "ap-south-1"
}

variable "github_repository" {
  description = "owner/name of the GitHub repo allowed to deploy."
  type        = string
  default     = "7show2me/Biz4kit"
}

data "aws_caller_identity" "current" {}

locals {
  environments = toset(["staging", "production"])
  account_id   = data.aws_caller_identity.current.account_id
}

# --- Terraform state (D39): versioned, encrypted, private, TLS only. Locking
# uses S3 lock files (use_lockfile), so there is no DynamoDB table.

resource "aws_s3_bucket" "state" {
  bucket = "biz4kit-tfstate-${local.account_id}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

# --- Image registry for the API + worker image (D28).

resource "aws_ecr_repository" "api" {
  name                 = "biz4kit-api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 30 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = { type = "expire" }
    }]
  })
}

# --- GitHub Actions deploys with short-lived OIDC credentials, one role per
# GitHub environment. No long-lived AWS keys in GitHub.

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "deploy" {
  for_each = local.environments

  name = "biz4kit-${each.key}-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:${each.key}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  for_each = local.environments

  name = "push-image-and-deploy"
  role = aws_iam_role.deploy[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrLogin"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "EcrPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeImages",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
        ]
        Resource = aws_ecr_repository.api.arn
      },
      {
        Sid      = "TaskDefinitions"
        Effect   = "Allow"
        Action   = ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"]
        Resource = "*"
      },
      {
        Sid      = "UpdateServices"
        Effect   = "Allow"
        Action   = ["ecs:DescribeServices", "ecs:UpdateService"]
        Resource = "arn:aws:ecs:${var.aws_region}:${local.account_id}:service/biz4kit-${each.key}/*"
      },
      {
        Sid    = "PassTaskRoles"
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = [
          "arn:aws:iam::${local.account_id}:role/biz4kit-${each.key}-task",
          "arn:aws:iam::${local.account_id}:role/biz4kit-${each.key}-task-execution",
        ]
        Condition = { StringEquals = { "iam:PassedToService" = "ecs-tasks.amazonaws.com" } }
      },
    ]
  })
}

output "state_bucket" {
  value = aws_s3_bucket.state.bucket
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "deploy_role_arns" {
  description = "Set as AWS_DEPLOY_ROLE_ARN in each GitHub environment."
  value       = { for env, role in aws_iam_role.deploy : env => role.arn }
}
