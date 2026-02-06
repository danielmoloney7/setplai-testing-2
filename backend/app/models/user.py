from sqlalchemy import Column, String, ForeignKey, Integer, DateTime
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
    goals = Column(String, nullable=True)
    xp = Column(Integer, default=0)
    coach_id = Column(String, ForeignKey("users.id"), nullable=True)

    created_programs = relationship("Program", back_populates="creator")
    session_logs = relationship("SessionLog", back_populates="player")
    players = relationship("User", backref=backref("coach", remote_side=[id]))

    # ✅ Squad Relationships
    owned_squads = relationship("Squad", back_populates="coach")
    squad_memberships = relationship("SquadMember", back_populates="player")

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