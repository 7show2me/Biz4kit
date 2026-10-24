data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# Shared across environments; created in bootstrap/.
data "aws_ecr_repository" "api" {
  name = "biz4kit-api"
}

locals {
  name     = "biz4kit-${var.environment}"
  api_port = 3000
  azs      = slice(data.aws_availability_zones.available.names, 0, 2)
  image    = "${data.aws_ecr_repository.api.repository_url}:${var.image_tag}"

  # Values are set by a person with the AWS CLI, never in Terraform (README).
  secret_names = ["DATABASE_URL", "REDIS_URL", "BETTER_AUTH_SECRET", "POLAR_ACCESS_TOKEN"]

  environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "CORS_ORIGIN", value = var.web_origin },
    { name = "BETTER_AUTH_URL", value = aws_apigatewayv2_api.api.api_endpoint },
    { name = "POLAR_SUCCESS_URL", value = "${var.web_origin}/success" },
    { name = "SENTRY_DSN", value = var.sentry_dsn },
    { name = "SENTRY_ENVIRONMENT", value = var.environment },
    { name = "SENTRY_RELEASE", value = var.image_tag },
  ]

  secrets = [
    for name in local.secret_names :
    { name = name, valueFrom = aws_secretsmanager_secret.server[name].arn }
  ]

  health_command = "fetch('http://localhost:${local.api_port}/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
}
