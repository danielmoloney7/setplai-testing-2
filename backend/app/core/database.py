from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import boto3
from dotenv import load_dotenv

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT", "local")
DB_HOST = os.getenv("DB_HOST")

def get_db_password():
    secret_name = f"setplai/{ENVIRONMENT}/db_password"
    try:
        client = boto3.client('secretsmanager', region_name="eu-west-1")
        secret = client.get_secret_value(SecretId=secret_name)
        return secret['SecretString']
    except Exception as e:
        print(f"Could not fetch secret from AWS: {e}")
        return None

if ENVIRONMENT != "local" and DB_HOST:
    DB_PASSWORD = get_db_password()
    SQLALCHEMY_DATABASE_URL = f"postgresql://setplai_admin:{DB_PASSWORD}@{DB_HOST}/postgres"
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./setplai_db.db")
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
