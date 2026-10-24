output "api_url" {
  description = "Public API endpoint (API Gateway)."
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "files_bucket" {
  value = aws_s3_bucket.files.bucket
}

output "secret_ids" {
  description = "Secrets a person must fill in before the first deploy."
  value       = [for s in aws_secretsmanager_secret.server : s.name]
}
