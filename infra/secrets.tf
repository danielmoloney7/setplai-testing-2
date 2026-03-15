# 1. Generate a random 16-character password
resource "random_password" "db_password" {
  length  = 16
  special = false # excluding special characters
}

# 2. Cretae a "Vault" in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_secret" {
  name                    = "setplai/${var.env}/db_password"
  recovery_window_in_days = 0 # Froces immediate deletion if we ever destroy
}

# 3. Random password inside the vault
resource "aws_secretsmanager_secret_version" "db_secret_val" {
  secret_id     = aws_secretsmanager_secret.db_secret.id
  secret_string = random_password.db_password.result
}

# JWT signing secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "setplai/${var.env}/jwt_secret"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret_val" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

