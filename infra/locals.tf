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
  base_secret_names = ["DATABASE_URL", "REDIS_URL", "BETTER_AUTH_SECRET"]

  # Dev only: Google sign-in, Resend, and the post-deploy smoke test. Production
  # gets none, so the /__smoke routes stay off there.
  extra_secret_names = var.environment == "dev" ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "RESEND_API_KEY", "SMOKE_SECRET"] : []

  secret_names = concat(local.base_secret_names, local.extra_secret_names)

  # Only secrets that already hold a value may be in a task, or it fails to start.
  task_secret_names = concat(local.base_secret_names, var.wire_extra_secrets ? local.extra_secret_names : [])

  environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "CORS_ORIGIN", value = var.web_origin },
    { name = "BETTER_AUTH_URL", value = aws_apigatewayv2_api.api.api_endpoint },
    { name = "SENTRY_DSN", value = var.sentry_dsn },
    { name = "SENTRY_ENVIRONMENT", value = var.environment },
    { name = "SENTRY_RELEASE", value = var.image_tag },
    # Production shares dev's Redis (D121); dev keeps local's names (D112).
    { name = "QUEUE_PREFIX", value = var.environment == "production" ? "biz4kit-production" : "bull" },
  ]

  secrets = [
    for name in local.task_secret_names :
    { name = name, valueFrom = aws_secretsmanager_secret.server[name].arn }
  ]

  health_command = "fetch('http://localhost:${local.api_port}/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
}
