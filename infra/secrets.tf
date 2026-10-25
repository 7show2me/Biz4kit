# Empty secrets: a person sets each value once with
#   aws secretsmanager put-secret-value --secret-id biz4kit/<env>/<NAME> --secret-string ...
# Terraform never sees the values, so they never reach state or git.
resource "aws_secretsmanager_secret" "server" {
  for_each = toset(local.secret_names)

  name                    = "biz4kit/${var.environment}/${each.key}"
  recovery_window_in_days = 7
}
