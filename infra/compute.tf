# 1. Elastic Container Registry
resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-api"
  image_tag_mutability = "MUTABLE"
}

# 2. VPC Connector 
resource "aws_apprunner_vpc_connector" "connector" {
  vpc_connector_name = "${var.project_name}-vpc-connector"
  subnets            = module.vpc.private_subnets
  security_groups    = [module.vpc.default_security_group_id]
}

# The Live API Server
resource "aws_apprunner_service" "api" {
  service_name = "${var.project_name}-api-service"

  source_configuration {
    image_repository {
      image_configuration {
        port = "8080"
        runtime_environment_variables = {
          "ENVIRONMENT"    = "${var.env}"
          "DB_HOST"        = aws_db_instance.postgres.endpoint
          "S3_BUCKET_NAME" = aws_s3_bucket.media.bucket
        }
        runtime_environment_secrets = {
          "SECRET_KEY" = aws_secretsmanager_secret_version.jwt_secret_val.arn
        }
      }

      image_identifier      = "${aws_ecr_repository.api.repository_url}:latest"
      image_repository_type = "ECR"
    }
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_build_role.arn
    }
    auto_deployments_enabled = false
  }

  instance_configuration {
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.connector.arn
    }
  }
}