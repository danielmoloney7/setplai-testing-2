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

# --- 1. SCHEMAS (Defined at the top to prevent NameError) ---

class SquadCreate(BaseModel):
    name: str
    level: Optional[str] = "Mixed"
    initial_members: List[str] = []

class AddMemberRequest(BaseModel):
    player_id: str

class SquadResponse(BaseModel):
    id: str
    name: str
    level: Optional[str]
    member_count: int
    active_program_name: Optional[str] = None
    completion_percentage: int = 0 

class MemberProgress(BaseModel):
    id: str
    name: str
    sessions_completed: int
    total_sessions: int
    completion_percentage: int

# ✅ Missing Schemas Restored
class AttendanceRequest(BaseModel):
    player_ids: List[str]
    date: Optional[datetime] = None

class LeaderboardEntry(BaseModel):
    player_id: str
    name: str
    avatar: Optional[str] = None
    attendance_count: int
    sessions_completed: int
    drill_score: int


# --- 2. ENDPOINTS ---

@router.get("", response_model=List[SquadResponse])
def get_my_squads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    squads = db.query(Squad).filter(Squad.coach_id == current_user.id).all()
    
    results = []
    for s in squads:
        total_member_completion = 0
        active_members_count = 0
        program_name_display = "No Active Plan"

        # 1. Iterate through members to find their INDIVIDUAL squad-assigned programs
        for member in s.members:
            if not member.player: continue

            # Find the latest program for this player THAT IS ASSIGNED TO THIS SQUAD
            player_squad_program = db.query(Program).filter(
                Program.player_id == member.player.id,
                Program.squad_id == s.id
            ).order_by(Program.created_at.desc()).first()

            if player_squad_program:
                program_name_display = player_squad_program.title # Use the title from one of them
                
                # Calculate progress for this specific player & program
                total_sessions = len(player_squad_program.sessions) if player_squad_program.sessions else 0
                
                if total_sessions > 0:
                    completed_count = db.query(SessionLog).filter(
                        SessionLog.program_id == player_squad_program.id,
                        SessionLog.player_id == member.player.id
                    ).count()
                    
                    pct = (completed_count / total_sessions) * 100
                    total_member_completion += min(pct, 100)
                    active_members_count += 1

        # 2. Calculate Average Squad Completion
        squad_completion = 0
        if active_members_count > 0:
            squad_completion = int(total_member_completion / active_members_count)

        results.append({
            "id": s.id, 
            "name": s.name, 
            "level": s.level, 
            "member_count": len(s.members),
            "active_program_name": program_name_display if active_members_count > 0 else None,
            "completion_percentage": squad_completion
        })

    return results

@router.get("/{squad_id}/progress", response_model=List[MemberProgress])
def get_squad_program_progress(squad_id: str, db: Session = Depends(get_db)):
    # Get Members
    members = db.query(SquadMember).filter(SquadMember.squad_id == squad_id).all()
    
    progress_list = []
    for m in members:
        if not m.player: continue
        
        # ✅ Fetch the SPECIFIC program assigned to this player for this squad
        player_program = db.query(Program).filter(
            Program.player_id == m.player_id,
            Program.squad_id == squad_id
        ).order_by(Program.created_at.desc()).first()

        completed = 0
        total = 0
        pct = 0

        if player_program:
            total = len(player_program.sessions) if player_program.sessions else 0
            if total > 0:
                completed = db.query(SessionLog).filter(
                    SessionLog.program_id == player_program.id,
                    SessionLog.player_id == m.player_id
                ).count()
                pct = int((completed / total) * 100)

        progress_list.append({
            "id": m.player.id,
            "name": m.player.name,
            "sessions_completed": completed,
            "total_sessions": total,
            "completion_percentage": min(pct, 100)
        })

    return progress_list

@router.get("/athletes")
def get_my_athletes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    athletes = db.query(User).filter(User.coach_id == current_user.id).all()
    return athletes

@router.post("")
def create_squad(squad_data: SquadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_squad = Squad(
        name=squad_data.name,
        level=squad_data.level,
        coach_id=current_user.id
    )
    db.add(new_squad)
    db.commit()
    db.refresh(new_squad)

    if squad_data.initial_members:
        for player_id in squad_data.initial_members:
            exists = db.query(SquadMember).filter(
                SquadMember.squad_id == new_squad.id, 
                SquadMember.player_id == player_id
            ).first()
            if not exists:
                member = SquadMember(squad_id=new_squad.id, player_id=player_id)
                db.add(member)
    
    db.commit()
    return {"status": "success", "squad_id": new_squad.id}

@router.get("/{squad_id}/members")
def get_squad_members(squad_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    squad = db.query(Squad).filter(Squad.id == squad_id).first()
    if not squad: raise HTTPException(404, "Squad not found")
    return [m.player for m in squad.members if m.player]

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
def mark_attendance(squad_id: str, data: AttendanceRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "COACH": raise HTTPException(403, "Only coaches can mark attendance.")
    date_val = data.date or datetime.utcnow()
    count = 0
    for pid in data.player_ids:
        existing = db.query(SquadAttendance).filter(SquadAttendance.squad_id == squad_id, SquadAttendance.player_id == pid, func.date(SquadAttendance.date) == date_val.date()).first()
        if not existing:
            rec = SquadAttendance(squad_id=squad_id, player_id=pid, date=date_val)
            db.add(rec)
            count += 1
    db.commit()
    return {"status": "success", "marked": count}

@router.get("/{squad_id}/leaderboard", response_model=List[LeaderboardEntry])
def get_squad_leaderboard(squad_id: str, db: Session = Depends(get_db)):
    members = db.query(SquadMember).filter(SquadMember.squad_id == squad_id).all()
    if not members: return []
    stats = []
    for m in members:
        player = m.player
        if not player: continue
        attendance_count = db.query(SquadAttendance).filter(SquadAttendance.squad_id == squad_id, SquadAttendance.player_id == player.id).count()
        sessions_completed = db.query(SessionLog).filter(SessionLog.player_id == player.id).count()
        drill_score = db.query(func.sum(DrillPerformance.achieved_value)).join(SessionLog, DrillPerformance.session_log_id == SessionLog.id).filter(SessionLog.player_id == player.id).scalar() or 0
        stats.append({"player_id": player.id, "name": player.name, "avatar": None, "attendance_count": attendance_count, "sessions_completed": sessions_completed, "drill_score": int(drill_score)})
    stats.sort(key=lambda x: x['sessions_completed'], reverse=True)
    return stats