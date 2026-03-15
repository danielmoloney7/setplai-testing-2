# The Role App Runner assumes when running the api 
resource "aws_iam_role" "apprunner_instance_role" {
  name = "${var.project_name}-apprunner-instance-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "tasks.apprunner.amazonaws.com" } }]
  })
}

# Let the server read the db password from secrets Manager
resource "aws_iam_role_policy" "secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.apprunner_instance_role.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "secretsmanager:GetSecretValue", Effect = "Allow", Resource = [aws_secretsmanager_secret.db_secret.arn, aws_secretsmanager_secret.jwt_secret.arn] }]
  })
}

# Role needed just to pull the Docker Image
resource "aws_iam_role" "apprunner_build_role" {
  name = "${var.project_name}-apprunner-build-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "build.apprunner.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_policy" {
  role       = aws_iam_role.apprunner_build_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}