from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid

# Helper to generate unique String IDs
def generate_id():
    return str(uuid.uuid4())

class Drill(Base):
    __tablename__ = "drills"

    # CHANGE: Integer -> String, with UUID default
    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String(255), index=True)
    category = Column(String(50))  # e.g., "Serve", "Forehand"
    difficulty = Column(String(20)) # "Beginner", "Advanced"
    description = Column(Text)
    default_duration_min = Column(Integer, default=10)
    video_url = Column(String(500), nullable=True)
    is_premium = Column(Boolean, default=False)

class Program(Base):
    __tablename__ = "programs"

    id = Column(String, primary_key=True, default=generate_id)
    title = Column(String(255))
    description = Column(Text, nullable=True)
    creator_id = Column(String, ForeignKey("users.id"))
    created_at = created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Relationships
    sessions = relationship("ProgramSession", back_populates="program")
    creator = relationship("User", back_populates="created_programs")

class ProgramSession(Base):
    __tablename__ = "program_sessions"

    id = Column(String, primary_key=True, default=generate_id)
    program_id = Column(String, ForeignKey("programs.id"))
    day_order = Column(Integer)
    drill_name = Column(String(255))
    duration_minutes = Column(Integer)
    notes = Column(Text, nullable=True)
    
    program = relationship("Program", back_populates="sessions")

class ProgramAssignment(Base):
    __tablename__ = "program_assignments"

    id = Column(String, primary_key=True, default=generate_id)
    program_id = Column(String, ForeignKey("programs.id"))
    coach_id = Column(String, ForeignKey("users.id"))
    player_id = Column(String, ForeignKey("users.id"))
    
    assigned_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="active")

    # Relationships (Essential for dashboard queries)
    program = relationship("Program")
    coach = relationship("User", foreign_keys=[coach_id])
    player = relationship("User", foreign_keys=[player_id])

class TrainingLog(Base):
    __tablename__ = "training_logs"

    id = Column(String, primary_key=True, default=generate_id)
    player_id = Column(String, ForeignKey("users.id"))
    program_id = Column(String, ForeignKey("programs.id"), nullable=True)
    drill_name = Column(String(255))
    duration_minutes = Column(Integer)
    
    rpe = Column(Integer)
    notes = Column(Text, nullable=True)
    
    completed_at = Column(DateTime, default=datetime.utcnow)

class SessionLog(Base):
    __tablename__ = "session_logs"

    id = Column(String, primary_key=True, default=generate_id)
    player_id = Column(String, ForeignKey("users.id"))
    program_id = Column(String, ForeignKey("programs.id"), nullable=True)
    session_id = Column(Integer, nullable=True) 
    
    date_completed = Column(DateTime, default=datetime.utcnow)
    duration_minutes = Column(Integer)
    rpe = Column(Integer) 
    notes = Column(String, nullable=True)
    
    # Relationships
    player = relationship("User", back_populates="session_logs")
    program = relationship("Program")
    drill_performances = relationship("DrillPerformance", back_populates="session_log")

class DrillPerformance(Base):
    __tablename__ = "drill_performances"

    id = Column(String, primary_key=True, default=generate_id)
    session_log_id = Column(String, ForeignKey("session_logs.id"))
    drill_id = Column(String) 
    outcome = Column(String) # "success" or "fail"
    achieved_value = Column(Integer, nullable=True)

    session_log = relationship("SessionLog", back_populates="drill_performances")