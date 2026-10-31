# Applies against a mocked AWS provider: no real account, no cost.
# Each assert is a hosting decision (D28, D31, D38, D42) written as a test.

mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = {
      names = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_data "aws_ecr_repository" {
    defaults = {
      repository_url = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/biz4kit-api"
      arn            = "arn:aws:ecr:ap-south-1:123456789012:repository/biz4kit-api"
    }
  }

  mock_resource "aws_iam_role" {
    defaults = {
      arn = "arn:aws:iam::123456789012:role/mock"
    }
  }

  mock_resource "aws_secretsmanager_secret" {
    defaults = {
      arn = "arn:aws:secretsmanager:ap-south-1:123456789012:secret:mock"
    }
  }

  mock_resource "aws_service_discovery_service" {
    defaults = {
      arn = "arn:aws:servicediscovery:ap-south-1:123456789012:service/srv-mock"
    }
  }

  mock_resource "aws_s3_bucket" {
    defaults = {
      arn = "arn:aws:s3:::mock-bucket"
    }
  }

  mock_resource "aws_cloudwatch_log_group" {
    defaults = {
      arn = "arn:aws:logs:ap-south-1:123456789012:log-group:mock"
    }
  }
}

variables {
  environment = "dev"
  image_tag   = "test"
  web_origin  = "https://dev.example.test"
  sentry_dsn  = "https://key@o1.ingest.sentry.io/1"
}

run "api_runs_on_fargate_without_a_load_balancer" {
  command = apply

  assert {
    condition     = aws_ecs_service.api.launch_type == "FARGATE"
    error_message = "The API must run on ECS Fargate (D38)."
  }

  assert {
    condition     = length(aws_ecs_service.api.load_balancer) == 0
    error_message = "No load balancer in front of the API (D42)."
  }

  assert {
    condition     = one(aws_ecs_service.api.service_registries).registry_arn == aws_service_discovery_service.api.arn
    error_message = "The API registers in Cloud Map so API Gateway can reach it (D42)."
  }

  assert {
    condition     = one(aws_ecs_service.api.network_configuration).assign_public_ip == true
    error_message = "Tasks run in public subnets with a public IP; there is no NAT gateway (D42)."
  }
}

run "api_gateway_reaches_the_api_through_the_vpc_link" {
  command = apply

  assert {
    condition     = aws_apigatewayv2_api.api.protocol_type == "HTTP"
    error_message = "API Gateway HTTP API, not REST (D42)."
  }

  assert {
    condition     = aws_apigatewayv2_integration.api.connection_type == "VPC_LINK"
    error_message = "The integration goes through the VPC Link (D42)."
  }

  assert {
    condition     = aws_apigatewayv2_integration.api.integration_uri == aws_service_discovery_service.api.arn
    error_message = "The integration targets the Cloud Map service (D42)."
  }

  assert {
    condition     = one(one(aws_service_discovery_service.api.dns_config).dns_records).type == "SRV"
    error_message = "API Gateway needs SRV records to find the task port."
  }
}

run "only_the_vpc_link_can_reach_the_api_tasks" {
  command = apply

  assert {
    condition     = aws_vpc_security_group_ingress_rule.api_from_vpc_link.security_group_id == aws_security_group.api.id
    error_message = "The ingress rule must be on the API task security group."
  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.api_from_vpc_link.referenced_security_group_id == aws_security_group.vpc_link.id
    error_message = "API tasks admit traffic only from the VPC Link security group (D42)."
  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.api_from_vpc_link.cidr_ipv4 == null
    error_message = "No CIDR-based ingress to the API tasks."
  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.api_from_vpc_link.from_port == 3000 && aws_vpc_security_group_ingress_rule.api_from_vpc_link.to_port == 3000
    error_message = "Only the API port is open."
  }
}

run "workers_take_no_inbound_traffic" {
  command = apply

  assert {
    condition     = aws_ecs_service.worker.launch_type == "FARGATE"
    error_message = "Workers run on ECS Fargate (D38)."
  }

  assert {
    condition     = length(aws_ecs_service.worker.service_registries) == 0 && length(aws_ecs_service.worker.load_balancer) == 0
    error_message = "Workers are not registered for inbound traffic (D42)."
  }

  assert {
    condition     = one(aws_ecs_service.worker.network_configuration).security_groups == toset([aws_security_group.worker.id])
    error_message = "Workers use their own security group."
  }

  assert {
    condition     = jsondecode(aws_ecs_task_definition.worker.container_definitions)[0].command == ["node", "--enable-source-maps", "dist/worker.mjs"]
    error_message = "The worker runs the BullMQ entry point from the same image."
  }
}

run "subnets_route_to_the_internet_gateway_not_a_nat" {
  command = apply

  assert {
    condition     = one(aws_route_table.public.route).gateway_id == aws_internet_gateway.main.id
    error_message = "Default route goes to the internet gateway; no NAT gateway (D42)."
  }

  assert {
    condition     = length(aws_subnet.public) == 2
    error_message = "Two public subnets in two availability zones."
  }
}

run "secrets_come_from_secrets_manager_not_plain_env" {
  command = apply

  assert {
    condition = alltrue([
      for name in ["DATABASE_URL", "REDIS_URL", "BETTER_AUTH_SECRET"] :
      contains([for s in jsondecode(aws_ecs_task_definition.api.container_definitions)[0].secrets : s.name], name)
    ])
    error_message = "Database, Redis and auth secrets are injected from Secrets Manager."
  }

  assert {
    condition = length([
      for e in jsondecode(aws_ecs_task_definition.api.container_definitions)[0].environment : e
      if contains(["DATABASE_URL", "REDIS_URL", "BETTER_AUTH_SECRET"], e.name)
    ]) == 0
    error_message = "No secret is passed as a plain environment variable."
  }
}

run "files_bucket_is_private" {
  command = apply

  assert {
    condition = (
      aws_s3_bucket_public_access_block.files.block_public_acls &&
      aws_s3_bucket_public_access_block.files.block_public_policy &&
      aws_s3_bucket_public_access_block.files.ignore_public_acls &&
      aws_s3_bucket_public_access_block.files.restrict_public_buckets
    )
    error_message = "Files are reached by signed URL only (D31); the bucket is never public."
  }
}

run "logs_keep_the_agreed_retention" {
  command = apply

  assert {
    condition     = aws_cloudwatch_log_group.api.retention_in_days == 14 && aws_cloudwatch_log_group.worker.retention_in_days == 14
    error_message = "Logs are kept 14 days (D110)."
  }
}

run "rejects_an_unknown_environment" {
  command = plan

  variables {
    environment = "staging"
  }

  expect_failures = [var.environment]
}

run "rejects_a_retention_cloudwatch_does_not_support" {
  command = plan

  variables {
    log_retention_days = 10
  }

  expect_failures = [var.log_retention_days]
}

run "api_and_worker_report_errors_to_sentry" {
  command = apply

  assert {
    condition = alltrue([
      for td in [aws_ecs_task_definition.api, aws_ecs_task_definition.worker] :
      lookup({ for e in jsondecode(td.container_definitions)[0].environment : e.name => e.value }, "SENTRY_DSN", "") == "https://key@o1.ingest.sentry.io/1" &&
      lookup({ for e in jsondecode(td.container_definitions)[0].environment : e.name => e.value }, "SENTRY_ENVIRONMENT", "") == "dev" &&
      lookup({ for e in jsondecode(td.container_definitions)[0].environment : e.name => e.value }, "SENTRY_RELEASE", "") == "test"
    ])
    error_message = "API and worker send errors to Sentry tagged with environment and image tag (D104)."
  }
}

run "rejects_a_sentry_dsn_that_is_not_https" {
  command = plan

  variables {
    sentry_dsn = "not-a-dsn"
  }

  expect_failures = [var.sentry_dsn]
}

run "dev_keeps_the_queue_names_local_uses" {
  command = plan

  assert {
    condition = alltrue([
      for td in [aws_ecs_task_definition.api, aws_ecs_task_definition.worker] :
      lookup({ for e in jsondecode(td.container_definitions)[0].environment : e.name => e.value }, "QUEUE_PREFIX", "") == "bull"
    ])
    error_message = "Dev shares queue names with local development (D112)."
  }
}

run "production_has_its_own_queue_prefix" {
  command = plan

  variables {
    environment = "production"
  }

  assert {
    condition = alltrue([
      for td in [aws_ecs_task_definition.api, aws_ecs_task_definition.worker] :
      lookup({ for e in jsondecode(td.container_definitions)[0].environment : e.name => e.value }, "QUEUE_PREFIX", "") == "biz4kit-production"
    ])
    error_message = "Production shares dev's Redis, so it needs its own queue prefix (D121)."
  }
}
