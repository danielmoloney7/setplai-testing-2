from sqlalchemy import Column, String, ForeignKey, Integer, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, backref
from app.core.database import Base
import uuid

def generate_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_id)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)
    name = Column(String)
    
    # ✅ NEW FIELDS
    age = Column(Integer, nullable=True)
    years_experience = Column(Integer, default=0)
    level = Column(String, default="Beginner") # Beginner, Intermediate, Advanced
    
    goals = Column(String, nullable=True)
    xp = Column(Integer, default=0)
    coach_id = Column(String, ForeignKey("users.id"), nullable=True)

    # Relationships
    # Note: Program and SessionLog must be defined in their respective files or this file
    created_programs = relationship("Program", back_populates="creator")
    session_logs = relationship("SessionLog", back_populates="player")
    
    # Coach <-> Player Relationship
    players = relationship("User", backref=backref("coach", remote_side=[id]))

    # Squad Relationships
    owned_squads = relationship("Squad", back_populates="coach")
    squad_memberships = relationship("SquadMember", back_populates="player")

    # Notifications
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    # Match Diary
    matches = relationship("MatchEntry", backref="user")

class Squad(Base):
    __tablename__ = "squads"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String)
    level = Column(String, nullable=True)
    coach_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    coach = relationship("User", back_populates="owned_squads")
    members = relationship("SquadMember", back_populates="squad", cascade="all, delete-orphan")

class SquadMember(Base):
    __tablename__ = "squad_members"

    id = Column(String, primary_key=True, default=generate_id)
    squad_id = Column(String, ForeignKey("squads.id"))
    player_id = Column(String, ForeignKey("users.id"))
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    squad = relationship("Squad", back_populates="members")
    player = relationship("User", back_populates="squad_memberships")

class MatchEntry(Base):
    __tablename__ = "match_entries"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id"))
    date = Column(DateTime, default=func.now())
    event_name = Column(String(255))
    
    # ✅ NEW: Format & Partner
    match_format = Column(String(50), default="Singles") # "Singles", "Doubles"
    partner_name = Column(String(255), nullable=True)    # Only for Doubles
    
    opponent_name = Column(String(255)) 
    round = Column(String(100), nullable=True)
    
    surface = Column(String(50), nullable=True)
    environment = Column(String(50), nullable=True)
    
    tactics = Column(String, nullable=True) 
    score = Column(String(100), nullable=True)
    result = Column(String(50), nullable=True)
    reflection = Column(String, nullable=True)
    
    coach_feedback = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id")) # Recipient (Coach)
    
    # ✅ NEW: Who triggered this? (Player ID)
    related_user_id = Column(String, nullable=True) 
    
    title = Column(String(255))
    message = Column(String(500))
    type = Column(String(50)) 
    reference_id = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ✅ THE FIX: Add relationship back to User
    user = relationship("User", back_populates="notifications")