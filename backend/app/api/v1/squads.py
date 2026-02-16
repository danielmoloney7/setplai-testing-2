from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import func, desc
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Squad, SquadMember, Notification
from app.models.training import SquadAttendance, SessionLog, DrillPerformance, Program
import uuid

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
    # ... existing check logic ...
    
    new_member = SquadMember(squad_id=squad_id, player_id=data.player_id)
    db.add(new_member)
    
    # ✅ NOTIFICATION LOGIC START
    squad = db.query(Squad).filter(Squad.id == squad_id).first()
    player = db.query(User).filter(User.id == data.player_id).first()
    
    if player and squad and not player.coach_id:
        player.coach_id = squad.coach_id
        db.add(player) # Update player record

    # ✅ 3. Send Notification
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=data.player_id,
        title="Squad Invite",
        message=f"You have been added to the squad: {squad.name}",
        type="SQUAD_INVITE",
        reference_id=squad_id
    )
    db.add(notif)
    # ✅ NOTIFICATION LOGIC END

    db.commit()
    return {"status": "success"}

@router.delete("/{squad_id}/members/{player_id}")
def remove_member(squad_id: str, player_id: str, db: Session = Depends(get_db)):
    # 1. Find Member
    member = db.query(SquadMember).filter(SquadMember.squad_id == squad_id, SquadMember.player_id == player_id).first()
    
    if member:
        # 2. Get Squad Details for Notification (Before deleting)
        squad = db.query(Squad).filter(Squad.id == squad_id).first()
        squad_name = squad.name if squad else "Team"

        # 3. Delete Member
        db.delete(member)
        
        # 4. ✅ Create Notification
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=player_id,
            title="Squad Update",
            message=f"You have been removed from {squad_name}.",
            type="SQUAD_REMOVE",
            reference_id=squad_id
        )
        db.add(notif)
        
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

@router.get("/{squad_id}/progress")
def get_squad_progress(squad_id: str, db: Session = Depends(get_db)):
    # 1. Find the ONE active player program assigned to this squad
    active_squad_program = db.query(Program).filter(
        Program.squad_id == squad_id,
        Program.status == "ACTIVE",
        Program.program_type == "PLAYER_PLAN" # Ensure it's the plan players execute
    ).first()

    if not active_squad_program:
        return {"player_progress": [], "squad_completion": 0}

    # 2. Get all members of the squad
    members = db.query(User).join(SquadMember).filter(SquadMember.squad_id == squad_id).all()
    
    # 3. Calculate total distinct sessions in this specific program
    # Assuming sessions are defined in a 'sessions' or 'schedule' field
    total_program_sessions = len(active_squad_program.sessions) 
    
    progress_results = []
    total_completed_by_all = 0

    for member in members:
        # ✅ FIX: Only count logs matching this specific squad program
        completed_sessions = db.query(SessionLog).filter(
            SessionLog.player_id == member.id,
            SessionLog.program_id == active_squad_program.id
        ).count()

        completion_pct = (completed_sessions / total_program_sessions * 100) if total_program_sessions > 0 else 0
        
        progress_results.append({
            "id": member.id,
            "name": member.name,
            "sessions_done": completed_sessions,
            "completion_percentage": min(completion_pct, 100)
        })
        total_completed_by_all += min(completion_pct, 100)

    squad_overall_completion = total_completed_by_all / len(members) if members else 0

    return {
        "active_program_title": active_squad_program.title,
        "player_progress": progress_results,
        "squad_completion": round(squad_overall_completion, 1)
    }