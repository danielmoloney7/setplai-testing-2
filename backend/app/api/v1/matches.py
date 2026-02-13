from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Notification, SquadMember, Squad, SquadMember
from app.models.training import MatchEntry
import uuid
from datetime import datetime

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
    date: Optional[datetime] = None    # ✅ Added for sorting/display
    coach_feedback: Optional[str] = None
    
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
        related_user_id=related_id # ✅ Save Player ID
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
    print(f"📡 API HIT: get_matches | User: {current_user.name} | Role: {current_user.role} | TeamView: {all_team}")

    # 1. Handle "All Team" View for Coaches
    if all_team and "COACH" in current_user.role.upper():
        # Get direct players
        direct_players = [p.id for p in db.query(User).filter(User.coach_id == current_user.id).all()]
        
        # Get squad players
        squad_ids = [s.id for s in db.query(Squad).filter(Squad.coach_id == current_user.id).all()]
        squad_players = [m.player_id for m in db.query(SquadMember).filter(SquadMember.squad_id.in_(squad_ids)).all()]
        
        target_ids = list(set(direct_players + squad_players))
        
        print(f"   found {len(target_ids)} players: {target_ids}")
        
        if not target_ids:
            return []
            
        query = db.query(MatchEntry).filter(MatchEntry.user_id.in_(target_ids))
    
    # 2. Handle Specific Player View
    else:
        target_id = player_id if (player_id and "COACH" in current_user.role.upper()) else current_user.id
        query = db.query(MatchEntry).filter(MatchEntry.user_id == target_id)

    # 3. Apply Filters
    if opponent:
        query = query.filter(MatchEntry.opponent_name.ilike(f"%{opponent}%"))
    
    matches = query.order_by(MatchEntry.date.desc()).all()
    print(f"   found {len(matches)} matches in DB.")

    # 4. ✅ FIX: Manually construct response to ensure player_name is included
    results = []
    for m in matches:
        # Fetch player name
        p_name = "Unknown"
        if all_team:
            user_obj = db.query(User).filter(User.id == m.user_id).first()
            if user_obj: 
                p_name = user_obj.name
        
        # Create a dictionary from the DB object
        match_dict = m.__dict__.copy()
        match_dict["player_name"] = p_name # Explicitly add the name
        
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

        # 🔍 Fallback: If no direct coach, check squads
        if not coach_id:
            membership = db.query(SquadMember).filter(SquadMember.player_id == player.id).first()
            if membership:
                squad = db.query(Squad).filter(Squad.id == membership.squad_id).first()
                if squad:
                    coach_id = squad.coach_id

        if coach_id:
            msg = f"{player.name} scheduled a match vs {match.opponent_name}."
            if match.score: msg = f"{player.name} logged a result vs {match.opponent_name}."
            
            background_tasks.add_task(
                create_notification, db, coach_id, "Match Update", msg, "MATCH_LOG", new_match.id, player.id
            )

    # ✅ ADD THIS BLOCK: Notify Player if Coach creates match
    if "COACH" in current_user.role.upper() and target_id != current_user.id:
        background_tasks.add_task(
            create_notification, db, target_id, "New Match Scheduled", 
            f"Coach added a match vs {match.opponent_name}", "MATCH_LOG", new_match.id, current_user.id
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

    # ✅ NOTIFY COACH: If Player finishes a scheduled match (Adds score)
    if "PLAYER" in current_user.role.upper() and was_scheduled and updates.score:
        player = db.query(User).filter(User.id == current_user.id).first()
        coach_id = getattr(player, 'coach_id', None)

        # 🔍 Fallback: Check Squads
        if not coach_id:
            membership = db.query(SquadMember).filter(SquadMember.player_id == player.id).first()
            if membership:
                squad = db.query(Squad).filter(Squad.id == membership.squad_id).first()
                if squad:
                    coach_id = squad.coach_id
        
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
    
    # ✅ NOTIFY PLAYER: Coach leaves feedback
    background_tasks.add_task(
        create_notification, db, match.user_id, "New Feedback", 
        f"Coach left notes on your match vs {match.opponent_name}", "MATCH_FEEDBACK", match.id
    )

    return {"message": "Feedback updated"}