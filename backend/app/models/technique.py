from sqlalchemy import Column, String, ForeignKey, Integer, DateTime, Float, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

def generate_id():
    return str(uuid.uuid4())

class ProVideo(Base):
    __tablename__ = "pro_videos"

    id = Column(String, primary_key=True, default=generate_id)
    player_name = Column(String)
    shot_type = Column(String) # Serve, Forehand, etc.
    handedness = Column(String) # Right/Left
    video_url = Column(String)
    thumbnail_url = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserVideo(Base):
    __tablename__ = "user_videos"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String, nullable=True)
    video_url = Column(String)
    thumbnail_url = Column(String, nullable=True)
    shot_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="videos")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id"))
    video_a_url = Column(String) # Usually Pro Video
    video_b_url = Column(String) # Usually User Video
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())