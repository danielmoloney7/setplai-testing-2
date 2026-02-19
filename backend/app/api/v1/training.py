from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload 
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.training import Drill, Program, ProgramAssignment, ProgramSession, SessionLog, DrillPerformance, generate_id, MatchEntry
from app.models.user import User, SquadMember, Notification, Squad
from app.core.security import get_current_user
from app.api.v1.matches import create_notification
import uuid


router = APIRouter()

# =======================
# 1. PYDANTIC SCHEMAS
# =======================

# --- Basic Schemas ---
class DrillItemSchema(BaseModel):
    drill_id: Optional[str] = None
    drill_name: str
    duration: int
    notes: Optional[str] = None
    target_value: Optional[int] = None 
    target_prompt: Optional[str] = None 

class SessionSchema(BaseModel):
    day: int
    drills: List[DrillItemSchema]

class ProgramCreateSchema(BaseModel):
    title: str
    description: Optional[str] = ""
    status: str = "PENDING"
    assigned_to: List[str] = [] 
    sessions: List[SessionSchema]
    program_type: str = "PLAYER_PLAN" # 'PLAYER_PLAN' | 'SQUAD_SESSION'
    squad_id: Optional[str] = None

class ProgramStatusUpdate(BaseModel):
    status: str 

# --- Session Logging Schemas ---
class DrillPerformanceCreate(BaseModel):
    drill_id: str
    outcome: str
    achieved_value: Optional[int] = None

class DrillPerformanceSchema(DrillPerformanceCreate):
    id: str
    drill_name: Optional[str] = None 
    
    class Config:
        from_attributes = True

class SessionLogCreate(BaseModel):
    program_id: Optional[str] = None 
    session_id: Optional[int] = None
    duration_minutes: int
    rpe: int
    notes: Optional[str] = None
    drill_performances: List[DrillPerformanceCreate] = []

class SessionLogSchema(SessionLogCreate):
    id: str
    player_id: str
    date_completed: datetime 
    drill_performances: List[DrillPerformanceSchema] = []
    coach_feedback: Optional[str] = None
    coach_liked: bool = False

    class Config:
        from_attributes = True

class SessionFeedbackUpdate(BaseModel):
    feedback: Optional[str] = None
    liked: Optional[bool] = None

# --- Coach Linking Schemas ---
class LinkCoachRequest(BaseModel):
    code: str

class RespondRequest(BaseModel):
    action: str # 'ACCEPT' or 'REJECT'

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    xp: int = 0
    level: Optional[str] = None
    goals: Optional[str] = None
    # ✅ Fields for Coach Linking
    coach_code: Optional[str] = None
    coach_link_status: Optional[str] = "NONE"
    coach_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserUpdateSchema(BaseModel):
    goals: List[str]
    level: Optional[str] = None

class DrillCreate(BaseModel):
    name: str
    category: str
    difficulty: str = "Intermediate"
    description: Optional[str] = None
    default_duration_min: int = 10
    target_value: Optional[int] = None 
    target_prompt: Optional[str] = None 
    drill_mode: str = "Cooperative"

# =======================
# 2. HELPER FUNCTIONS
# =======================

def enrich_logs_with_names(logs: List[SessionLog], db: Session) -> List[SessionLogSchema]:
    """
    Takes raw DB logs, fetches drill names, and returns enriched Pydantic models.
    """
    if not logs:
        return []

    # 1. Fetch all active drills for primary lookup
    all_drills = db.query(Drill).all()
    drill_map = {d.id: d.name for d in all_drills}

    # 2. Fallback: Fetch names from the Program Definition (Snapshot)
    program_ids = list(set([log.program_id for log in logs if log.program_id]))
    fallback_map = {}
    
    if program_ids:
        prog_sessions = db.query(ProgramSession).filter(ProgramSession.program_id.in_(program_ids)).all()
        for ps in prog_sessions:
            if ps.drill_id and ps.drill_name:
                fallback_map[ps.drill_id] = ps.drill_name

    # 3. Convert and Enrich
    results = []
    for log in logs:
        log_model = SessionLogSchema.model_validate(log)
        for perf in log_model.drill_performances:
            if perf.drill_id in drill_map:
                perf.drill_name = drill_map[perf.drill_id]
            elif perf.drill_id in fallback_map:
                perf.drill_name = fallback_map[perf.drill_id]
            else:
                perf.drill_name = "Custom Drill"
        results.append(log_model)
    return results

# =======================
# 3. ENDPOINTS
# =======================

@router.post("/seed-drills")
def seed_drills(db: Session = Depends(get_db)):
    if db.query(Drill).first():
        return {"message": "Drills already seeded!"}
    
    sample_drills = [
        {"name": "Box Sprints", "category": "Footwork", "difficulty": "Beginner", "description": "Sprint to each corner.", "id": generate_id()},
        {"name": "Kick Serve", "category": "Serve", "difficulty": "Advanced", "description": "Brush up the back of the ball.", "id": generate_id()},
        {"name": "Volley Walls", "category": "Net", "difficulty": "Intermediate", "description": "Keep ball off ground.", "id": generate_id()},
        {"name": "Deep Crosscourt", "category": "Groundstrokes", "difficulty": "Advanced", "description": "Hit past service line.", "id": generate_id()},
    ]
    for d in sample_drills:
        db.add(Drill(**d))
    db.commit()
    return {"message": "Database seeded!"}

@router.get("/drills")
def get_drills(db: Session = Depends(get_db)):
    return db.query(Drill).all()

# ✅ UPDATED: get_programs now returns ARCHIVED programs & creator_id
@router.get("/programs")
def get_programs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Fetch logic
        if "COACH" in current_user.role.upper():
            programs = db.query(Program).filter(
                Program.creator_id == current_user.id
                # ✅ FIX: Removed "Program.status != 'ARCHIVED'" so coaches see them
            ).all()
        else:
            programs = (
                db.query(Program)
                .join(ProgramAssignment, Program.id == ProgramAssignment.program_id)
                .filter(
                    ProgramAssignment.player_id == current_user.id
                    # ✅ FIX: Removed "Program.status != 'ARCHIVED'" so players see them
                )
                .all()
            )
        
        results = []
        for p in programs:
            # Determine Status (Overall)
            status = "PENDING"
            
            if "COACH" in current_user.role.upper():
                # ✅ FIX: Use actual program status
                status = p.status 
            else:
                # ✅ FIX: Check if program itself is archived
                if p.status == "ARCHIVED":
                    status = "ARCHIVED"
                else:
                    assignment = db.query(ProgramAssignment).filter(
                        ProgramAssignment.program_id == p.id,
                        ProgramAssignment.player_id == current_user.id
                    ).first()
                    if assignment:
                        status = assignment.status

            # Fetch Relations With Status Details
            assignments = db.query(ProgramAssignment).filter(ProgramAssignment.program_id == p.id).all()
            assignments_data = []
            for a in assignments:
                player = db.query(User).filter(User.id == a.player_id).first()
                assignments_data.append({
                    "id": a.player_id,
                    "name": player.name if player else "Unknown",
                    "status": a.status 
                })

            creator_name = "System"
            try:
                creator = db.query(User).filter(User.id == p.creator_id).first()
                if creator: creator_name = creator.name
            except: pass

            sessions = db.query(ProgramSession).filter(ProgramSession.program_id == p.id).order_by(ProgramSession.day_order).all()
            created_at_val = getattr(p, "created_at", None) or "2023-01-01T00:00:00Z"

            results.append({
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "creator_id": p.creator_id, # ✅ CRITICAL FIX: Needed for Dashboard "Coach Assigned" logic
                "coach_name": creator_name,
                "status": status,
                "created_at": created_at_val,
                "program_type": getattr(p, "program_type", "PLAYER_PLAN"), 
                "squad_id": getattr(p, "squad_id", None),
                "assigned_to": assignments_data,
                "schedule": [
                    {
                        "day_order": s.day_order,
                        "drill_id": s.drill_id,
                        "drill_name": s.drill_name,
                        "duration_minutes": s.duration_minutes,
                        "notes": s.notes,
                        "target_value": s.target_value,
                        "target_prompt": s.target_prompt
                    } for s in sessions
                ]
            })
        return results
    except Exception as e:
        print(f"Error fetching programs: {e}")
        return []

@router.post("/programs")
def create_program(
    program_in: ProgramCreateSchema, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Create the Program Record
        new_program = Program(
            title=program_in.title,
            description=program_in.description,
            creator_id=current_user.id,
            created_at=datetime.utcnow(),
            program_type=program_in.program_type, 
            squad_id=program_in.squad_id,
            status=program_in.status if program_in.status else "ACTIVE" # ✅ Set initial status
        )
        db.add(new_program)
        db.commit()
        db.refresh(new_program)

        # 2. Add Sessions & Drills
        for sess in program_in.sessions:
            for drill in sess.drills: 
                db_session = ProgramSession(
                    program_id=new_program.id,
                    day_order=sess.day,
                    drill_id=drill.drill_id,
                    drill_name=drill.drill_name,
                    duration_minutes=drill.duration,
                    notes=drill.notes or "",
                    target_value=drill.target_value,
                    target_prompt=drill.target_prompt,
                    media_url=getattr(drill, 'media_url', None)
                )
                db.add(db_session)

        # 3. ✅ AUTO-COMPLETE EXISTING SQUAD PROGRAMS OF THE SAME TYPE
        if program_in.squad_id:
            old_programs = db.query(Program).filter(
                Program.squad_id == program_in.squad_id,
                Program.program_type == program_in.program_type, # ✅ CRITICAL: Only match the same type
                Program.id != new_program.id,
                Program.status != "COMPLETED"
            ).all()
            
            for old_p in old_programs:
                # Mark the program itself as completed
                old_p.status = "COMPLETED"
                
                # If it's a PLAYER_PLAN, we must also complete the individual player assignments
                if program_in.program_type == "PLAYER_PLAN":
                    active_assignments = db.query(ProgramAssignment).filter(
                        ProgramAssignment.program_id == old_p.id,
                        ProgramAssignment.status.in_(["ACTIVE", "PENDING"])
                    ).all()
                    
                    for assignment in active_assignments:
                        assignment.status = "COMPLETED"
                        
                        # Notify the player that the old program was replaced
                        background_tasks.add_task(
                            create_notification, db, assignment.player_id, 
                            "Program Completed! 🎉", 
                            f"Your squad finished '{old_p.title}'. A new plan has been assigned!", 
                            "PROGRAM_COMPLETE", assignment.program_id
                        )

        # 4. Handle New Assignments (Only for PLAYER_PLAN)
        if program_in.program_type == "PLAYER_PLAN":
            final_player_ids = set()
            raw_targets = program_in.assigned_to

            if not raw_targets or "SELF" in raw_targets:
                final_player_ids.add(current_user.id)

            for target_id in raw_targets:
                if target_id == "SELF": continue
                squad_members = db.query(SquadMember).filter(SquadMember.squad_id == target_id).all()
                if squad_members:
                    for m in squad_members:
                        final_player_ids.add(m.player_id)
                else:
                    final_player_ids.add(target_id)

            for player_id in final_player_ids:
                if not player_id: continue
                final_status = "PENDING"
                if str(player_id) == str(current_user.id) or program_in.status == "ACTIVE":
                    final_status = "ACTIVE"

                new_assignment = ProgramAssignment(
                    program_id=new_program.id,
                    player_id=str(player_id),
                    coach_id=current_user.id,
                    status=final_status,
                    assigned_at=datetime.utcnow()
                )
                db.add(new_assignment)
                
                # Notify player of NEW program
                if str(player_id) != str(current_user.id):
                     background_tasks.add_task(
                        create_notification, db, player_id, 
                        "New Program Assigned", 
                        f"Coach assigned a new program: {new_program.title}", 
                        "PROGRAM_ASSIGNED", new_program.id
                    )

        db.commit()
        return {"status": "success", "program_id": new_program.id}

    except Exception as e:
        db.rollback() 
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

# ✅ UPDATED: Delete Program -> Soft Delete for Players
@router.delete("/programs/{program_id}")
def delete_program(
    program_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Try to find the program
    program = db.query(Program).filter(Program.id == program_id).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Case A: User is the Coach/Creator -> Archive it & Notify Players
    if program.creator_id == current_user.id:
        
        assignments = db.query(ProgramAssignment).filter(
            ProgramAssignment.program_id == program_id,
            ProgramAssignment.status != "ARCHIVED"
        ).all()

        for assignment in assignments:
            # Notify player
            if assignment.player_id != current_user.id:
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=assignment.player_id,
                    title="Program Removed",
                    message=f"Coach {current_user.name} has removed the program '{program.title}'.",
                    type="PROGRAM_REMOVED",
                    reference_id=None 
                )
                db.add(notif)
            
            # Update status to ARCHIVED
            assignment.status = "ARCHIVED"

        # Archive the Program itself
        program.status = "ARCHIVED"
        db.commit()
        return {"status": "success", "message": "Program archived and players notified"}

    # Case B: User is a Player assigned to it -> Soft Delete Assignment
    assignment = db.query(ProgramAssignment).filter(
        ProgramAssignment.program_id == program_id,
        ProgramAssignment.player_id == current_user.id
    ).first()

    if assignment:
        # ✅ FIX: Mark as ARCHIVED instead of deleting row so it shows in history
        assignment.status = "ARCHIVED"
        
        # Notify Coach
        if program.creator_id:
            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=program.creator_id,
                title="Player Left Program",
                message=f"{current_user.name} has removed the program '{program.title}' from their plans.",
                type="PROGRAM_LEFT",
                reference_id=program.id,
                related_user_id=current_user.id
            )
            db.add(notif)

        db.commit()
        return {"status": "success", "message": "Archived in your plans"}

    raise HTTPException(status_code=403, detail="Not authorized to delete this program")

@router.get("/my-active-program")
def get_my_active_program(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(ProgramAssignment).filter(
        ProgramAssignment.player_id == current_user.id,
        ProgramAssignment.status == "ACTIVE"
    ).order_by(desc(ProgramAssignment.assigned_at)).first()

    if not assignment: return None

    program = db.query(Program).filter(Program.id == assignment.program_id).first()
    if not program: return None

    sessions_data = db.query(ProgramSession).filter(ProgramSession.program_id == program.id).order_by(ProgramSession.day_order).all()
    coach = db.query(User).filter(User.id == assignment.coach_id).first()
    
    return {
        "id": program.id,
        "title": program.title,
        "description": program.description,
        "coach_name": coach.name if coach else "Coach",
        "assigned_at": assignment.assigned_at,
        "schedule": sessions_data 
    }

@router.patch("/programs/{program_id}/status")
def update_program_status(
    program_id: str,
    status_update: ProgramStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = db.query(ProgramAssignment).filter(
        ProgramAssignment.program_id == program_id,
        ProgramAssignment.player_id == current_user.id
    ).first()

    if not assignment: raise HTTPException(404, "Assignment not found")

    assignment.status = status_update.status
    db.commit()
    return {"status": "success", "new_status": assignment.status}

@router.get("/my-athletes", response_model=List[UserResponse])
def get_my_athletes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "COACH": return []
    return db.query(User).filter(User.coach_id == current_user.id).all()

@router.post("/sessions")
def create_session_log(
    session_data: SessionLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_log = SessionLog(
        player_id=current_user.id,
        program_id=session_data.program_id,
        session_id=session_data.session_id,
        duration_minutes=session_data.duration_minutes,
        rpe=session_data.rpe,
        notes=session_data.notes,
        date_completed=datetime.utcnow()
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    for perf in session_data.drill_performances:
        db_perf = DrillPerformance(
            session_log_id=new_log.id,
            drill_id=perf.drill_id,
            outcome=perf.outcome,
            achieved_value=perf.achieved_value
        )
        db.add(db_perf)

    xp_earned = (session_data.duration_minutes or 0) * 10
    current_user.xp = (current_user.xp or 0) + xp_earned
    db.commit()
    return {"status": "success", "log_id": new_log.id, "xp_earned": xp_earned}

@router.get("/my-profile", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/my-profile")
def update_my_profile(
    profile_data: UserUpdateSchema, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    current_user.goals = ",".join(profile_data.goals)
    if profile_data.level: current_user.level = profile_data.level
    db.commit()
    return {"status": "success", "goals": current_user.goals, "level": current_user.level}

@router.get("/my-session-logs", response_model=List[SessionLogSchema])
def get_my_session_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(SessionLog).options(joinedload(SessionLog.drill_performances)).filter(SessionLog.player_id == current_user.id).order_by(desc(SessionLog.date_completed)).all()
    return enrich_logs_with_names(logs, db)

@router.put("/sessions/{session_id}/feedback")
def update_session_feedback(
    session_id: str,
    feedback_data: SessionFeedbackUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "COACH": raise HTTPException(403, "Only coaches can leave feedback.")
    session = db.query(SessionLog).filter(SessionLog.id == session_id).first()
    if not session: raise HTTPException(404, "Session not found.")
    if feedback_data.feedback is not None: session.coach_feedback = feedback_data.feedback
    if feedback_data.liked is not None: session.coach_liked = feedback_data.liked
    db.commit()
    db.refresh(session)
    return session

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    return []

@router.get("/athletes/{player_id}/logs", response_model=List[SessionLogSchema])
def get_player_logs(
    player_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "COACH": raise HTTPException(403, "Only coaches can view athlete logs.")
    logs = db.query(SessionLog).options(joinedload(SessionLog.drill_performances)).filter(SessionLog.player_id == player_id).order_by(desc(SessionLog.date_completed)).all()
    return enrich_logs_with_names(logs, db)

@router.get("/coach/activity")
def get_coach_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    athlete_ids = [u.id for u in db.query(User).filter(User.coach_id == current_user.id).all()]
    squad_ids = [s.id for s in db.query(Squad).filter(Squad.coach_id == current_user.id).all()]
    squad_athlete_ids = [m.player_id for m in db.query(SquadMember).filter(SquadMember.squad_id.in_(squad_ids)).all()]
    all_ids = list(set(athlete_ids + squad_athlete_ids))

    logs = db.query(SessionLog).options(joinedload(SessionLog.drill_performances)).filter(SessionLog.player_id.in_(all_ids)).order_by(SessionLog.date_completed.desc()).limit(10).all()
    enriched_logs = enrich_logs_with_names(logs, db)
    matches = db.query(MatchEntry).filter(MatchEntry.user_id.in_(all_ids)).order_by(MatchEntry.date.desc()).limit(10).all()

    combined_activity = []
    for log_model in enriched_logs:
        item = log_model.model_dump()
        item['type'] = "SESSION"
        item['title'] = "Completed Training"
        item['date'] = item['date_completed'] 
        player_name = db.query(User.name).filter(User.id == item['player_id']).scalar()
        item['player_name'] = player_name
        combined_activity.append(item)
        
    for m in matches:
        combined_activity.append({
            "id": m.id,
            "type": "MATCH",
            "player_name": db.query(User.name).filter(User.id == m.user_id).scalar(),
            "opponent_name": m.opponent_name,
            "event_name": m.event_name,
            "date": m.date,
            "score": m.score,
            "result": m.result,
            "user_id": m.user_id 
        })

    combined_activity.sort(key=lambda x: x['date'], reverse=True)
    return combined_activity[:15]

@router.post("/drills")
def create_drill(
    drill_data: DrillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "COACH": raise HTTPException(403, "Only coaches can add drills.")
    new_drill = Drill(
        id=generate_id(),
        name=drill_data.name,
        category=drill_data.category,
        difficulty=drill_data.difficulty,
        description=drill_data.description,
        default_duration_min=drill_data.default_duration_min,
        target_value=drill_data.target_value,
        target_prompt=drill_data.target_prompt,
        drill_mode=drill_data.drill_mode 
    )
    db.add(new_drill)
    db.commit()
    db.refresh(new_drill)
    return new_drill

@router.get("/sessions")
def get_session_logs(
    user_id: Optional[str] = None, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    target_id = current_user.id
    if user_id and "COACH" in current_user.role.upper(): target_id = user_id
    logs = db.query(SessionLog).filter(SessionLog.player_id == target_id).options(joinedload(SessionLog.drill_performances)).order_by(desc(SessionLog.date_completed)).all()
    return logs

# ✅ COACH LINKING API ENDPOINTS
@router.post("/request-coach")
def request_coach(
    data: LinkCoachRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "COACH":
        raise HTTPException(status_code=400, detail="Coaches cannot link to another coach.")

    coach = db.query(User).filter(User.coach_code == data.code.strip()).first()
    
    if not coach:
        raise HTTPException(status_code=404, detail="Invalid Coach Code.")

    current_user.coach_id = coach.id
    current_user.coach_link_status = "PENDING"
    db.commit()

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=coach.id,
        title="New Roster Request",
        message=f"{current_user.name} wants to join your team.",
        type="COACH_REQUEST",
        reference_id=current_user.id,
        related_user_id=current_user.id
    )
    db.add(notif)
    db.commit()

    return {"status": "success", "message": "Request sent to coach"}

@router.get("/coach/requests", response_model=List[UserResponse])
def get_coach_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "COACH":
        raise HTTPException(403, "Only coaches can view requests.")
        
    requests = db.query(User).filter(
        User.coach_id == current_user.id,
        User.coach_link_status == "PENDING"
    ).all()
    
    return requests

@router.post("/coach/requests/{player_id}/respond")
def respond_to_request(
    player_id: str,
    data: RespondRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "COACH":
        raise HTTPException(403, "Only coaches can respond.")

    player = db.query(User).filter(User.id == player_id).first()
    if not player or player.coach_id != current_user.id:
        raise HTTPException(404, "Request not found.")

    if data.action == "ACCEPT":
        player.coach_link_status = "ACTIVE"
        msg = f"Coach {current_user.name} accepted your request!"
    else:
        player.coach_link_status = "NONE"
        player.coach_id = None 
        msg = f"Coach {current_user.name} declined your request."

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=player.id,
        title="Coach Request Update",
        message=msg,
        type="COACH_RESPONSE",
        related_user_id=current_user.id
    )
    db.add(notif)
    db.commit()

    return {"status": "success", "new_status": player.coach_link_status}

@router.post("/disconnect-coach")
def disconnect_coach(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validation
    if current_user.role == "COACH":
        raise HTTPException(status_code=400, detail="Coaches cannot disconnect from themselves.")

    if not current_user.coach_id:
        raise HTTPException(status_code=400, detail="No coach connected.")

    # 2. Capture old coach ID
    old_coach_id = current_user.coach_id
    
    # 3. Reset Direct Player Link
    current_user.coach_id = None
    current_user.coach_link_status = "NONE"
    
    # ---------------------------------------------------------
    # ✅ FIX: Also remove player from any Squads owned by this coach
    # ---------------------------------------------------------
    coach_squads = db.query(Squad).filter(Squad.coach_id == old_coach_id).all()
    squad_ids = [s.id for s in coach_squads]
    
    if squad_ids:
        # Delete membership records for these squads
        db.query(SquadMember).filter(
            SquadMember.player_id == current_user.id,
            SquadMember.squad_id.in_(squad_ids)
        ).delete(synchronize_session=False)
    # ---------------------------------------------------------

    # 4. Notify the Coach
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=old_coach_id,
        title="Player Left Roster",
        message=f"{current_user.name} has disconnected from your team.",
        type="PLAYER_LEFT",
        reference_id=current_user.id,
        related_user_id=current_user.id
    )
    db.add(notif)
    
    db.commit()
    return {"status": "success", "message": "Disconnected from coach and squads."}