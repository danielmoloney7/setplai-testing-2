from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import uuid

def generate_id():
    return str(uuid.uuid4())

class ProVideo(Base):
    __tablename__ = "pro_videos"
    id = Column(String, primary_key=True, default=generate_id)
    player_name = Column(String, index=True)
    shot_type = Column(String)  # e.g., "Forehand"
    handedness = Column(String) # "Right" or "Left"
    tags = Column(String)       # Comma-separated tags
    video_url = Column(String)  # Path to static file
    thumbnail_url = Column(String, nullable=True)

class UserVideo(Base):
    __tablename__ = "user_videos"
    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id"))
    video_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Comparison(Base):
    __tablename__ = "comparisons"
    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id"))
    
    # Relationships
    pro_video_id = Column(String, ForeignKey("pro_videos.id"))
    user_video_id = Column(String, ForeignKey("user_videos.id"))
    
    # The "Manual Sync" Data
    pro_offset_sec = Column(Float, default=0.0)
    user_offset_sec = Column(Float, default=0.0)
    playback_rate = Column(Float, default=1.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    pro_video = relationship("ProVideo")
    user_video = relationship("UserVideo")