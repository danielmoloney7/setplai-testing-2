from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship, backref
from app.core.database import Base
import uuid

def generate_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    # 1. ID is now a String (UUID)
    id = Column(String, primary_key=True, default=generate_id)
    
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)
    name = Column(String)
    goals = Column(String, nullable = True)
    
    # Coach ID is also a String
    coach_id = Column(String, ForeignKey("users.id"), nullable=True)

    # 2. REQUIRED RELATIONSHIPS (This fixes your error)
    # Links back to Program.creator
    created_programs = relationship("Program", back_populates="creator")
    
    # Links back to SessionLog.player
    session_logs = relationship("SessionLog", back_populates="player")

    players = relationship("User", 
        backref=backref("coach", remote_side=[id])
    )