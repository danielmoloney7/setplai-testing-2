# 1. Generate a random 16-character password
resource "random_password" "db_password" {
  length  = 16
  special = false # excluding special characters
}

# 2. Cretae a "Vault" in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_secret" {
  name                    = "setplai/prod/db_password"
  recovery_window_in_days = 0 # Froces immediate deletion if we ever destroy
}

# 3. Random password inside the vault
resource "aws_secretsmanager_secret_version" "db_secret_val" {
  secret_id     = aws_secretsmanager_secret.db_secret.id
  secret_string = random_password.db_password.result
}

