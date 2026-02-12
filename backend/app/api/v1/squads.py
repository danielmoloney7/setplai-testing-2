from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import func, desc
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Squad, SquadMember
from app.models.training import SquadAttendance, SessionLog, DrillPerformance, Program

router = APIRouter()

# --- SCHEMAS ---
class SquadCreate(BaseModel):
    name: str
    level: Optional[str] = "Mixed"
    initial_members: List[str] = []
    active_program_name: Optional[str] = None
    completion_percentage: int = 0

class AddMemberRequest(BaseModel):
    player_id: str

class SquadResponse(BaseModel):
    id: str
    name: str
    level: Optional[str]
    member_count: int

class AttendanceRequest(BaseModel):
    player_ids: List[str]
    date: Optional[datetime] = None

class LeaderboardEntry(BaseModel):
    player_id: str
    name: str
    avatar: Optional[str]
    attendance_count: int
    sessions_completed: int
    drill_score: int

class MemberProgress(BaseModel):
    id: str
    name: str
    sessions_completed: int
    total_sessions: int
    completion_percentage: int

# --- ENDPOINTS ---

# ✅ FIX: Changed "/" to "" to prevent 307 Redirects
@router.get("", response_model=List[SquadResponse])
def get_my_squads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "COACH":
        raise HTTPException(403, "Only coaches can view squads.")
    
    squads = db.query(Squad).filter(Squad.coach_id == current_user.id).all()
    
    return [
        {"id": s.id, "name": s.name, "level": s.level, "member_count": len(s.members)}
        for s in squads
    ]

# ✅ FIX: Changed "/" to ""
@router.post("")
def create_squad(squad_data: SquadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "COACH":
        raise HTTPException(403, "Only coaches can create squads.")
    
    # 1. Create Squad
    new_squad = Squad(
        name=squad_data.name,
        level=squad_data.level,
        coach_id=current_user.id
    )
    db.add(new_squad)
    db.commit()
    db.refresh(new_squad)

    # 2. Add Initial Members
    for player_id in squad_data.initial_members:
        member = SquadMember(squad_id=new_squad.id, player_id=player_id)
        db.add(member)
    
    db.commit()
    return {"status": "success", "squad_id": new_squad.id}

@router.get("/{squad_id}/members")
def get_squad_members(squad_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    squad = db.query(Squad).filter(Squad.id == squad_id).first()
    if not squad: raise HTTPException(404, "Squad not found")
    
    # Return full user objects
    return [m.player for m in squad.members]

@router.post("/{squad_id}/members")
def add_member(squad_id: str, data: AddMemberRequest, db: Session = Depends(get_db)):
    exists = db.query(SquadMember).filter(SquadMember.squad_id == squad_id, SquadMember.player_id == data.player_id).first()
    if exists: return {"status": "already_member"}

    new_member = SquadMember(squad_id=squad_id, player_id=data.player_id)
    db.add(new_member)
    db.commit()
    return {"status": "success"}

@router.delete("/{squad_id}/members/{player_id}")
def remove_member(squad_id: str, player_id: str, db: Session = Depends(get_db)):
    member = db.query(SquadMember).filter(SquadMember.squad_id == squad_id, SquadMember.player_id == player_id).first()
    if member:
        db.delete(member)
        db.commit()
    return {"status": "removed"}

@router.post("/{squad_id}/attendance")
def mark_attendance(
    squad_id: str, 
    data: AttendanceRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "COACH":
        raise HTTPException(403, "Only coaches can mark attendance.")
    
    date_val = data.date or datetime.utcnow()
    
    count = 0
    for pid in data.player_ids:
        # Check if already marked for this day to prevent dupes (simplistic check)
        # In production, you might check date range (start of day to end of day)
        existing = db.query(SquadAttendance).filter(
            SquadAttendance.squad_id == squad_id,
            SquadAttendance.player_id == pid,
            func.date(SquadAttendance.date) == date_val.date()
        ).first()

        if not existing:
            rec = SquadAttendance(squad_id=squad_id, player_id=pid, date=date_val)
            db.add(rec)
            count += 1
            
    db.commit()
    return {"status": "success", "marked": count}

# ✅ NEW: Get Squad Leaderboard
@router.get("/{squad_id}/leaderboard", response_model=List[LeaderboardEntry])
def get_squad_leaderboard(squad_id: str, db: Session = Depends(get_db)):
    # 1. Get all members
    members = db.query(SquadMember).filter(SquadMember.squad_id == squad_id).all()
    if not members: return []
    
    stats = []
    
    for m in members:
        player = m.player
        if not player: continue

        # A. Attendance Count
        attendance_count = db.query(SquadAttendance).filter(
            SquadAttendance.squad_id == squad_id,
            SquadAttendance.player_id == player.id
        ).count()

        # B. Sessions Completed (Only those assigned to this squad implicitly or explicitly)
        # We look for logs where the program is associated with this squad or general player logs
        # For simplicity, we count ALL sessions completed by this player as "Dedication"
        sessions_completed = db.query(SessionLog).filter(
            SessionLog.player_id == player.id
        ).count()

        # C. Drill Score (Sum of achieved values)
        # Calculate total reps/score from all drill performances
        drill_score = db.query(func.sum(DrillPerformance.achieved_value))\
            .join(SessionLog, DrillPerformance.session_log_id == SessionLog.id)\
            .filter(SessionLog.player_id == player.id)\
            .scalar() or 0

        stats.append({
            "player_id": player.id,
            "name": player.name,
            "avatar": None, # Add avatar field to User model if you have it
            "attendance_count": attendance_count,
            "sessions_completed": sessions_completed,
            "drill_score": drill_score
        })
    
    # Sort by Sessions Completed by default
    stats.sort(key=lambda x: x['sessions_completed'], reverse=True)
    
    return stats