from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Notification, Squad, SquadMember # ✅ Added Squad imports
from app.models.training import MatchEntry
import uuid
from datetime import datetime # ✅ Added datetime

router = APIRouter()

# --- SCHEMAS ---

class MatchCreate(BaseModel):
    event_name: str
    opponent_name: str
    match_format: Optional[str] = "Singles"
    partner_name: Optional[str] = None
    round: str
    surface: Optional[str] = None
    environment: Optional[str] = None
    tactics: Optional[str] = None
    score: Optional[str] = None
    result: Optional[str] = None
    reflection: Optional[str] = None
    player_id: Optional[str] = None 

class MatchUpdate(BaseModel):
    tactics: Optional[str] = None
    surface: Optional[str] = None
    environment: Optional[str] = None
    event_name: Optional[str] = None
    opponent_name: Optional[str] = None
    match_format: Optional[str] = None
    partner_name: Optional[str] = None
    score: Optional[str] = None
    reflection: Optional[str] = None
    result: Optional[str] = None

class MatchFeedback(BaseModel):
    feedback: str

class MatchResponse(MatchCreate):
    id: str
    user_id: str
    player_name: Optional[str] = None  # ✅ Added for Coach View
    coach_feedback: Optional[str] = None
    date: Optional[datetime] = None # ✅ Added Date
    
    class Config:
        orm_mode = True

# --- HELPERS ---

def create_notification(db: Session, user_id: str, title: str, message: str, type: str, ref_id: str, related_id: str = None):
    if not user_id: return
    
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=title,
        message=message,
        type=type, 
        reference_id=ref_id,
        related_user_id=related_id 
    )
    db.add(notif)
    db.commit()

# --- ENDPOINTS ---

@router.get("/", response_model=List[MatchResponse])
def get_matches(
    player_id: Optional[str] = None, 
    opponent: Optional[str] = None,
    all_team: bool = False,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # ✅ FIX: Auto-enable "All Team" view for Coaches if no specific player is requested
    # This prevents the "0 matches" issue if the frontend forgets the flag
    if "COACH" in current_user.role.upper() and not player_id and not all_team:
        all_team = True

    # 1. Handle "All Team" View
    if all_team and "COACH" in current_user.role.upper():
        direct_players = [p.id for p in db.query(User).filter(User.coach_id == current_user.id).all()]
        
        squad_ids = [s.id for s in db.query(Squad).filter(Squad.coach_id == current_user.id).all()]
        squad_players = [m.player_id for m in db.query(SquadMember).filter(SquadMember.squad_id.in_(squad_ids)).all()]
        
        target_ids = list(set(direct_players + squad_players))
        
        if not target_ids:
            return []
            
        query = db.query(MatchEntry).filter(MatchEntry.user_id.in_(target_ids))
    
    # 2. Handle Specific Player or Self View
    else:
        target_id = current_user.id
        if player_id and "COACH" in current_user.role.upper():
            target_id = player_id
        
        query = db.query(MatchEntry).filter(MatchEntry.user_id == target_id)

    # 3. Apply Filters & Sort
    if opponent:
        query = query.filter(MatchEntry.opponent_name.ilike(f"%{opponent}%"))
    
    matches = query.order_by(MatchEntry.date.desc()).all()

    # 4. Attach Player Names for Coach Context
    results = []
    for m in matches:
        match_dict = m.__dict__.copy()
        if all_team:
            player = db.query(User).filter(User.id == m.user_id).first()
            match_dict["player_name"] = player.name if player else "Unknown"
        results.append(match_dict)

    return results

@router.post("/", response_model=MatchResponse)
def create_match_log(
    match: MatchCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    target_id = current_user.id
    if match.player_id and "COACH" in current_user.role.upper():
        target_id = match.player_id

    new_match = MatchEntry(
        user_id=target_id,
        event_name=match.event_name,
        opponent_name=match.opponent_name,
        match_format=match.match_format,
        partner_name=match.partner_name,
        round=match.round,
        surface=match.surface,
        environment=match.environment,
        tactics=match.tactics,
        score=match.score,
        result=match.result,
        reflection=match.reflection
    )
    db.add(new_match)
    db.commit()
    db.refresh(new_match)

    # ✅ NOTIFY COACH: When Player Schedules or Logs a Match
    if "PLAYER" in current_user.role.upper():
        player = db.query(User).filter(User.id == current_user.id).first()
        coach_id = getattr(player, 'coach_id', None)
        
        if coach_id:
            msg = f"{player.name} scheduled a match vs {match.opponent_name}."
            if match.score: msg = f"{player.name} logged a result vs {match.opponent_name}."
            
            # Using new_match.id as reference_id
            background_tasks.add_task(
                create_notification, db, coach_id, "Match Update", msg, "MATCH_LOG", new_match.id, player.id 
            )

    return new_match

@router.patch("/{match_id}")
def update_match_details(
    match_id: str,
    updates: MatchUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    match = db.query(MatchEntry).filter(MatchEntry.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if match.user_id != current_user.id and "COACH" not in current_user.role.upper():
        raise HTTPException(status_code=403, detail="Not authorized")

    was_scheduled = match.result == 'Scheduled' or not match.score
    
    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(match, key, value)
    
    db.commit()
    
    # ✅ NOTIFY PLAYER: If Coach updates Tactics
    if "COACH" in current_user.role.upper() and updates.tactics:
        background_tasks.add_task(
            create_notification, db, match.user_id, "Game Plan Updated", 
            f"Coach updated tactics for vs {match.opponent_name}", "MATCH_TACTICS", match.id
        )

    # ✅ NOTIFY COACH: If Player finishes a scheduled match
    if "PLAYER" in current_user.role.upper() and was_scheduled and updates.score:
        player = db.query(User).filter(User.id == current_user.id).first()
        coach_id = getattr(player, 'coach_id', None)
        
        if coach_id:
             background_tasks.add_task(
                create_notification, db, coach_id, "Match Result", 
                f"{player.name} completed match vs {match.opponent_name}", "MATCH_RESULT", match.id, player.id
            )

    return {"message": "Match updated successfully"}

@router.put("/{match_id}/feedback")
def update_coach_feedback(
    match_id: str,
    feedback: MatchFeedback,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if "COACH" not in current_user.role.upper():
        raise HTTPException(status_code=403, detail="Only coaches can leave feedback")
        
    match = db.query(MatchEntry).filter(MatchEntry.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    match.coach_feedback = feedback.feedback
    db.commit()
    
    # ✅ NOTIFY PLAYER
    background_tasks.add_task(
        create_notification, db, match.user_id, "New Feedback", 
        f"Coach left notes on your match vs {match.opponent_name}", "MATCH_FEEDBACK", match.id
    )

    return {"message": "Feedback updated"}