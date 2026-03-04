terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-west-1"

  default_tags {
    tags = {
      Environment = var.env
      GithubRepo  = "setplai-testing-2"
      CreatedBy   = "terraform"
      Application = var.project_name
      Service     = "setplai"
    }
  }
}