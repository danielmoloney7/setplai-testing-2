from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Notification, SquadMember, Squad
from app.models.training import MatchEntry

router = APIRouter()

# --- SCHEMAS ---
class MatchCreate(BaseModel):
    date: datetime
    event_name: str
    opponent_name: str
    round: Optional[str] = ""
    tactics: Optional[str] = ""
    player_id: Optional[str] = None # ✅ New: Allow creating for another user

class MatchUpdate(BaseModel):
    score: Optional[str] = None
    result: Optional[str] = None
    reflection: Optional[str] = None
    tactics: Optional[str] = None

class MatchResponse(BaseModel):
    id: str
    user_id: str # ✅ Include owner ID
    date: datetime
    event_name: str
    opponent_name: str
    round: Optional[str]
    tactics: Optional[str]
    score: Optional[str]
    result: Optional[str]
    reflection: Optional[str]
    class Config:
        orm_mode = True

# --- ENDPOINTS ---

@router.post("/", response_model=MatchResponse)
def log_match(
    match_data: MatchCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    target_user_id = current_user.id
    
    # Check if creating for another player (Coach Mode)
    if match_data.player_id and match_data.player_id != current_user.id:
        # Verify Coach Logic (Simplified: Check if Coach)
        if "COACH" not in current_user.role.upper():
             raise HTTPException(403, "Only coaches can log matches for other players.")
        target_user_id = match_data.player_id

    # 1. Create Match Entry
    new_match = MatchEntry(
        user_id=target_user_id,
        date=match_data.date,
        event_name=match_data.event_name,
        opponent_name=match_data.opponent_name,
        round=match_data.round,
        tactics=match_data.tactics
    )
    db.add(new_match)
    
    # 2. Notifications
    if target_user_id != current_user.id:
        # Notify Player: "Coach set tactics for your match"
        notif = Notification(
            user_id=target_user_id,
            title=f"New Match Prep: vs {match_data.opponent_name}",
            message=f"Coach {current_user.name} has added a match plan for {match_data.event_name}.",
            type="MATCH_LOG",
            reference_id=new_match.id
        )
        db.add(notif)
    else:
        # Player logging for themselves -> Notify Coach
        # Find coach via Squads
        squad_membership = db.query(SquadMember).filter(SquadMember.player_id == current_user.id).first()
        if squad_membership:
            squad = db.query(Squad).filter(Squad.id == squad_membership.squad_id).first()
            if squad:
                notif = Notification(
                    user_id=squad.coach_id,
                    title=f"New Match Log: {current_user.name}",
                    message=f"{current_user.name} is playing {match_data.opponent_name}.",
                    type="MATCH_LOG",
                    reference_id=new_match.id
                )
                db.add(notif)

    db.commit()
    db.refresh(new_match)
    return new_match

@router.get("/", response_model=List[MatchResponse])
def get_matches(
    player_id: Optional[str] = None, # ✅ Allow filtering by player
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    target_id = current_user.id
    
    # If Coach requests specific player
    if player_id and "COACH" in current_user.role.upper():
        target_id = player_id

    return db.query(MatchEntry).filter(
        MatchEntry.user_id == target_id
    ).order_by(MatchEntry.date.desc()).all()

@router.patch("/{match_id}", response_model=MatchResponse)
def update_match_result(
    match_id: str,
    update_data: MatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allow update if user owns it OR if user is a coach
    match = db.query(MatchEntry).filter(MatchEntry.id == match_id).first()
    if not match:
        raise HTTPException(404, "Match not found")
        
    # Permission Check
    if match.user_id != current_user.id and "COACH" not in current_user.role.upper():
         raise HTTPException(403, "Not authorized to edit this match")
    
    if update_data.score is not None: match.score = update_data.score
    if update_data.result is not None: match.result = update_data.result
    if update_data.reflection is not None: match.reflection = update_data.reflection
    if update_data.tactics is not None: match.tactics = update_data.tactics
    
    db.commit()
    db.refresh(match)
    return match