from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.technique import ProVideo, UserVideo, Analysis
from pydantic import BaseModel
import shutil
import os
import uuid

router = APIRouter()

# --- SCHEMAS ---
class VideoResponse(BaseModel):
    id: str
    url: str
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    type: str = "user" # 'pro' or 'user'

    class Config:
        orm_mode = True

class AnalysisCreate(BaseModel):
    video_a_url: str
    video_b_url: str
    notes: Optional[str] = None

# --- ENDPOINTS ---

@router.get("/library", response_model=List[VideoResponse])
def get_pro_library(db: Session = Depends(get_db)):
    videos = db.query(ProVideo).all()
    return [
        {
            "id": v.id, "url": v.video_url, "title": f"{v.player_name} - {v.shot_type}", 
            "thumbnail": v.thumbnail_url, "type": "pro"
        } 
        for v in videos
    ]

@router.get("/my-videos", response_model=List[VideoResponse])
def get_user_videos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    videos = db.query(UserVideo).filter(UserVideo.user_id == current_user.id).all()
    return [
        {
            "id": v.id, "url": v.video_url, "title": v.title or "Untitled Video", 
            "thumbnail": v.thumbnail_url, "type": "user"
        } 
        for v in videos
    ]

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...), 
    title: str = Form(...),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Ensure upload directory exists
    UPLOAD_DIR = "uploads/videos"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generate filename
    file_ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = f"{UPLOAD_DIR}/{filename}"
    
    # Save file locally (In production, upload to S3 here)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB Entry
    # Note: URL is relative path, frontend must prepend BaseURL
    video_url = f"/static/videos/{filename}" 
    
    new_video = UserVideo(
        user_id=current_user.id,
        title=title,
        video_url=video_url
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    return {"id": new_video.id, "url": video_url, "title": title, "type": "user"}

@router.post("/analysis")
def save_analysis(
    analysis: AnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_analysis = Analysis(
        user_id=current_user.id,
        video_a_url=analysis.video_a_url,
        video_b_url=analysis.video_b_url,
        notes=analysis.notes
    )
    db.add(new_analysis)
    db.commit()
    return {"message": "Analysis saved"}