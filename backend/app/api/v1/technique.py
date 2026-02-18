import os
import shutil
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.technique import ProVideo, UserVideo, Comparison

router = APIRouter()

# --- SCHEMAS ---
class ProVideoSchema(BaseModel):
    id: str
    player_name: str
    shot_type: str
    tags: str
    video_url: str

    class Config:
        from_attributes = True

class ComparisonCreate(BaseModel):
    pro_video_id: str
    user_video_id: str
    pro_offset_sec: float
    user_offset_sec: float

# --- ENDPOINTS ---

@router.post("/pro-videos", response_model=ProVideoSchema)
def create_pro_video(
    player_name: str = Form(...),
    shot_type: str = Form(...),
    tags: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "COACH":
         raise HTTPException(403, "Only coaches can upload pro videos")

    # Ensure directory exists
    os.makedirs("static/pro", exist_ok=True)
    
    # Save file
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = f"static/pro/{filename}"
    
    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to DB
    db_video = ProVideo(
        player_name=player_name,
        shot_type=shot_type,
        tags=tags,
        video_url=f"/static/pro/{filename}"
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

@router.get("/pro-videos", response_model=List[ProVideoSchema])
def get_pro_videos(db: Session = Depends(get_db)):
    return db.query(ProVideo).all()

@router.post("/upload-user-video")
def upload_user_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    os.makedirs("static/user", exist_ok=True)
    
    filename = f"{current_user.id}_{uuid.uuid4()}_{file.filename}"
    file_path = f"static/user/{filename}"
    
    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db_video = UserVideo(
        user_id=current_user.id,
        video_url=f"/static/user/{filename}"
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    return {"id": db_video.id, "url": db_video.video_url}

@router.post("/comparisons")
def save_comparison(
    comp: ComparisonCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_comp = Comparison(
        user_id=current_user.id,
        **comp.dict()
    )
    db.add(db_comp)
    db.commit()
    return {"status": "success", "id": db_comp.id}