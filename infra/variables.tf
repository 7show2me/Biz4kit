variable "aws_profile" {
  description = "Local AWS CLI profile; null in CI, which uses GitHub OIDC (never put keys in Terraform files)."
  type        = string
  default     = null
}

variable "aws_region" {
  description = "Mumbai (D28)."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "staging or production (Workflow doc, Infra). PR previews: open question BIZ-87."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "image_tag" {
  description = "Tag in the biz4kit-api ECR repo for the first deploy. CI registers later revisions."
  type        = string
}

variable "web_origin" {
  description = "Origin of the web app on Vercel, for CORS and Better Auth (for example https://app.example.com)."
  type        = string

  validation {
    condition     = can(regex("^https://[^/]+$", var.web_origin))
    error_message = "web_origin must be an https origin with no path."
  }
}

variable "log_retention_days" {
  # TODO(BIZ-88): no default until the retention period is decided.
  description = "Days CloudWatch keeps API and worker logs. Open question BIZ-88."
  type        = number

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.log_retention_days)
    error_message = "log_retention_days must be a period CloudWatch supports."
  }
}

variable "vpc_cidr" {
  description = "Address range of this environment's VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "api_cpu" {
  description = "Fargate CPU units for one API task."
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Fargate memory (MiB) for one API task."
  type        = number
  default     = 512
}

variable "worker_cpu" {
  description = "Fargate CPU units for one worker task."
  type        = number
  default     = 256
}

variable "worker_memory" {
  description = "Fargate memory (MiB) for one worker task."
  type        = number
  default     = 512
}
