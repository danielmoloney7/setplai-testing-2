variable "aws_region" {
  description = "AWS Region for Resource"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "setplai"
}

variable "env" {
  description = "Environment (dev, prod)"
  type        = string
  default     = "dev"
}