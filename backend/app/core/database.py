from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# The Connection String: "mysql+driver://user:password@host/dbname"
# SQLALCHEMY_DATABASE_URL = "mysql+mysqlconnector://root:secret@127.0.0.1:3306/setplai_db"
SQLALCHEMY_DATABASE_URL = "sqlite:///./setplai_db.db"
# 1. Create the engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
# 2. Create a SessionLocal class (we use this to talk to the DB)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Create the Base class (all your models will inherit from this)
Base = declarative_base()

# 4. Dependency (used in API routes later)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()