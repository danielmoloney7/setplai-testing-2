from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Notification

router = APIRouter()

class NotificationSchema(BaseModel):
    id: str
    title: str
    message: str
    type: str
    reference_id: str | None
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True

@router.get("/", response_model=List[NotificationSchema])
def get_my_notifications(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

@router.post("/{notif_id}/read")
def mark_as_read(
    notif_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, 
        Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(404, "Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.get("/unread-counts")
def get_unread_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch all unread notifications for this user (Coach)
    unread = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).all()
    
    total = len(unread)
    
    # Group by Player (related_user_id)
    player_counts = {}
    for n in unread:
        if n.related_user_id:
            player_counts[n.related_user_id] = player_counts.get(n.related_user_id, 0) + 1
            
    return {
        "total": total,
        "players": player_counts # { "player_id_1": 2, "player_id_2": 5 }
    }