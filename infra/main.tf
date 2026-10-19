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

# Registry for the API + worker image (D28). The container service
# (App Runner or ECS Fargate) is added once chosen in WBS 1.1.
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
