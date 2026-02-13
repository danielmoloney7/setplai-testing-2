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
    age = Column(Integer)
    years_experience = Column(Integer)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)
    name = Column(String)
    goals = Column(String, nullable=True)
    xp = Column(Integer, default=0)
    coach_id = Column(String, ForeignKey("users.id"), nullable=True)
    level = Column(String)
    created_programs = relationship("Program", back_populates="creator")
    session_logs = relationship("SessionLog", back_populates="player")
    players = relationship("User", backref=backref("coach", remote_side=[id]))

    # ✅ Squad Relationships
    owned_squads = relationship("Squad", back_populates="coach")
    squad_memberships = relationship("SquadMember", back_populates="player")

    # ✅ NEW: Notifications (Fixes the crash)
    notifications = relationship("Notification", back_populates="user")

    # ✅ NEW: Match Diary (For the new feature)
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

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String(255))
    message = Column(String(500))
    type = Column(String(50)) 
    reference_id = Column(String(255), nullable=True) 
    
    # ✅ THIS WAS MISSING
    related_user_id = Column(String, nullable=True)

    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")