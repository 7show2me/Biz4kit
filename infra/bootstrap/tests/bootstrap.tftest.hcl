mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_resource "aws_s3_bucket" {
    defaults = {
      arn = "arn:aws:s3:::mock-bucket"
    }
  }

  mock_resource "aws_iam_openid_connect_provider" {
    defaults = {
      arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
    }
  }

  mock_resource "aws_ecr_repository" {
    defaults = {
      arn = "arn:aws:ecr:ap-south-1:123456789012:repository/biz4kit-api"
    }
  }
}

run "state_bucket_is_versioned_encrypted_and_private" {
  command = apply

  assert {
    condition     = one(aws_s3_bucket_versioning.state.versioning_configuration).status == "Enabled"
    error_message = "State bucket keeps old versions so a bad apply can be rolled back (D39)."
  }

  assert {
    condition = (
      aws_s3_bucket_public_access_block.state.block_public_acls &&
      aws_s3_bucket_public_access_block.state.block_public_policy &&
      aws_s3_bucket_public_access_block.state.ignore_public_acls &&
      aws_s3_bucket_public_access_block.state.restrict_public_buckets
    )
    error_message = "State bucket is never public."
  }

  assert {
    condition     = strcontains(aws_s3_bucket_policy.state.policy, "aws:SecureTransport")
    error_message = "State bucket refuses non-TLS requests."
  }
}

run "github_deploy_roles_trust_only_this_repo_and_environment" {
  command = apply

  assert {
    condition = alltrue([
      for env in ["dev", "production"] :
      jsondecode(aws_iam_role.deploy[env].assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:7show2me@293344814/Biz4kit@1425347880:environment:${env}"
    ])
    error_message = "Each deploy role is assumable only from its GitHub environment in this repo."
  }

  assert {
    condition = alltrue([
      for env in ["dev", "production"] :
      jsondecode(aws_iam_role.deploy[env].assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:aud"] == "sts.amazonaws.com"
    ])
    error_message = "OIDC audience is STS."
  }
}

run "ecr_tags_are_immutable" {
  command = apply

  assert {
    condition     = aws_ecr_repository.api.image_tag_mutability == "IMMUTABLE"
    error_message = "An image tag always means the same build, so rollback to a tag is safe."
  }
}
