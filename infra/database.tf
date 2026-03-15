# 1. Security Group (Firewall) for the Database
resource "aws_security_group" "rds_sg" {
  name   = "${var.project_name}-rds-sg"
  vpc_id = module.vpc.vpc_id

  # Temp: Open to the world so I can connect from my laptop
  # ENSURE locking of this to ONLY allow app runner later 

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


# 2. Subnet Group (Where the database lives geographically)
resource "aws_db_subnet_group" "db_subnets" {
  name = "${var.project_name}-db-subnets"
  # TEMP - allow public subnets for local laptop access
  subnet_ids = module.vpc.public_subnets
}


# 3. The Actual PostgreSQL Database Instance
resource "aws_db_instance" "postgres" {
  identifier        = "${var.project_name}-db"
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  engine            = "postgres"
  engine_version    = "16"
  username          = "setplai_admin"
  password          = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  skip_final_snapshot = true
  publicly_accessible = false
}

