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

variable "environment" {
  description = "preview, staging or production (Workflow doc, Infra)."
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["preview", "staging", "production"], var.environment)
    error_message = "environment must be preview, staging or production."
  }
}
