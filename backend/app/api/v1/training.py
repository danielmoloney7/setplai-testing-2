from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload 
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.training import Drill, Program, ProgramAssignment, ProgramSession, SessionLog, DrillPerformance, generate_id
from app.models.user import User, SquadMember
from app.core.security import get_current_user


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

class ProgramStatusUpdate(BaseModel):
    status: str 

# --- Session Logging Schemas ---
class DrillPerformanceCreate(BaseModel):
    drill_id: str
    outcome: str
    achieved_value: Optional[int] = None

class DrillPerformanceSchema(DrillPerformanceCreate):
    id: str
    drill_name: Optional[str] = None # ✅ ADDED: Field for the drill name
    
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
    date_completed: datetime 
    drill_performances: List[DrillPerformanceSchema] = []
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    xp: int = 0
    class Config:
        from_attributes = True

class UserUpdateSchema(BaseModel):
    goals: List[str]

class DrillCreate(BaseModel):
    name: str
    category: str
    difficulty: str = "Intermediate"
    description: Optional[str] = None
    default_duration_min: int = 10

# =======================
# 2. HELPER FUNCTIONS
# =======================

def enrich_logs_with_names(logs: List[SessionLog], db: Session) -> List[SessionLogSchema]:
    """
    Takes raw DB logs, fetches drill names, and returns enriched Pydantic models.
    """
    if not logs:
        return []

    # 1. Fetch all drills for lookup
    all_drills = db.query(Drill).all()
    drill_map = {d.id: d.name for d in all_drills}

    # 2. Convert and Enrich
    results = []
    for log in logs:
        # Convert to Pydantic model (using from_orm / model_validate logic)
        log_model = SessionLogSchema.model_validate(log)
        
        # Inject Drill Names
        for perf in log_model.drill_performances:
            if perf.drill_id in drill_map:
                perf.drill_name = drill_map[perf.drill_id]
            else:
                perf.drill_name = "Custom Drill" # Fallback if ID not found
        
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

@router.get("/programs")
def get_programs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Fetch logic
        if "COACH" in current_user.role.upper():
            programs = db.query(Program).filter(Program.creator_id == current_user.id).all()
        else:
            programs = (
                db.query(Program)
                .join(ProgramAssignment, Program.id == ProgramAssignment.program_id)
                .filter(ProgramAssignment.player_id == current_user.id)
                .all()
            )
        
        results = []
        for p in programs:
            # Determine Status (Overall)
            status = "PENDING"
            if "COACH" in current_user.role.upper():
                status = "ACTIVE"
            else:
                assignment = db.query(ProgramAssignment).filter(
                    ProgramAssignment.program_id == p.id,
                    ProgramAssignment.player_id == current_user.id
                ).first()
                if assignment:
                    status = assignment.status

            # ✅ Fetch Relations With Status Details
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
                "coach_name": creator_name,
                "status": status,
                "created_at": created_at_val,
                "assigned_to": assignments_data, # ✅ Now returns Objects, not just IDs
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
        raise HTTPException(500, f"Failed to fetch programs: {str(e)}")

@router.post("/programs")
def create_program(
    program_in: ProgramCreateSchema, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        new_program = Program(
            title=program_in.title,
            description=program_in.description,
            creator_id=current_user.id,
            created_at=datetime.utcnow() 
        )
        db.add(new_program)
        db.commit()
        db.refresh(new_program)

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
                    target_prompt=drill.target_prompt
                )
                db.add(db_session)

        raw_targets = program_in.assigned_to
        final_player_ids = set()

        if not raw_targets or "SELF" in raw_targets:
            final_player_ids.add(current_user.id)

        for target_id in raw_targets:
            if target_id == "SELF": 
                continue
            
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

            assignment = ProgramAssignment(
                program_id=new_program.id,
                player_id=str(player_id),
                coach_id=current_user.id,
                status=final_status,
                assigned_at=datetime.utcnow()
            )
            db.add(assignment)

        db.commit()
        return {"status": "success", "program_id": new_program.id}

    except Exception as e:
        db.rollback() 
        print(f"CRITICAL ERROR in create_program: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

@router.get("/my-active-program")
def get_my_active_program(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(ProgramAssignment).filter(
        ProgramAssignment.player_id == current_user.id,
        ProgramAssignment.status == "ACTIVE"
    ).order_by(desc(ProgramAssignment.assigned_at)).first()

    if not assignment:
        return None

    program = db.query(Program).filter(Program.id == assignment.program_id).first()
    if not program: return None

    sessions_data = db.query(ProgramSession).filter(
        ProgramSession.program_id == program.id
    ).order_by(ProgramSession.day_order).all()

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

    if not assignment:
        raise HTTPException(404, "Assignment not found")

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
    print(f"👉 RECEIVING SESSION ID: {session_data.session_id}")
    print(f"👉 DRILLS: {len(session_data.drill_performances)}")

    # 1. Create Log
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
    
    # 2. Add Performances
    for perf in session_data.drill_performances:
        db_perf = DrillPerformance(
            session_log_id=new_log.id,
            drill_id=perf.drill_id,
            outcome=perf.outcome,
            achieved_value=perf.achieved_value
        )
        db.add(db_perf)

    # 3. Update XP
    xp_earned = (session_data.duration_minutes or 0) * 10
    current_user.xp = (current_user.xp or 0) + xp_earned
    
    db.commit()
    print("✅ SAVED")
    return {"status": "success", "log_id": new_log.id, "xp_earned": xp_earned}

@router.get("/my-profile", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/my-session-logs", response_model=List[SessionLogSchema])
def get_my_session_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fetch logs with joined drills
    logs = db.query(SessionLog).options(joinedload(SessionLog.drill_performances)).filter(SessionLog.player_id == current_user.id).order_by(desc(SessionLog.date_completed)).all()
    
    # Enrich with Drill Names using helper
    return enrich_logs_with_names(logs, db)

@router.put("/my-profile")
def update_my_profile(profile_data: UserUpdateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.goals = ",".join(profile_data.goals) 
    db.commit()
    return {"status": "success", "goals": current_user.goals}

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    return []

@router.get("/athletes/{player_id}/logs", response_model=List[SessionLogSchema])
def get_player_logs(
    player_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "COACH":
        raise HTTPException(403, "Only coaches can view athlete logs.")
    
    logs = db.query(SessionLog).options(joinedload(SessionLog.drill_performances)).filter(SessionLog.player_id == player_id).order_by(desc(SessionLog.date_completed)).all()
    
    return enrich_logs_with_names(logs, db)

@router.get("/coach/activity")
def get_coach_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "COACH":
        return []
    
    players = db.query(User).filter(User.coach_id == current_user.id).all()
    player_ids = [p.id for p in players]
    
    if not player_ids:
        return []

    logs = db.query(SessionLog).options(joinedload(SessionLog.drill_performances)).filter(SessionLog.player_id.in_(player_ids)).order_by(desc(SessionLog.date_completed)).limit(20).all()
    
    # Enrich with Drill Names first
    enriched_logs = enrich_logs_with_names(logs, db)
    
    # Add Player Names (Need to return dicts, not Pydantic models here since schema doesn't have player_name)
    results = []
    for log_model, original_log in zip(enriched_logs, logs):
        player = next((p for p in players if p.id == original_log.player_id), None)
        player_name = player.name if player else "Unknown Athlete"
        
        # Convert back to dict to add extra field
        log_dict = log_model.model_dump()
        log_dict['player_name'] = player_name
        results.append(log_dict)

    return results

@router.post("/drills")
def create_drill(
    drill_data: DrillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "COACH":
        raise HTTPException(403, "Only coaches can add drills.")

    new_drill = Drill(
        id=generate_id(),
        name=drill_data.name,
        category=drill_data.category,
        difficulty=drill_data.difficulty,
        description=drill_data.description
    )
    db.add(new_drill)
    db.commit()
    db.refresh(new_drill)
    return new_drill

@router.get("/sessions")
def get_session_logs(
    user_id: Optional[str] = None, # ✅ Allow filtering by specific user ID
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    target_id = current_user.id
    
    # If Coach requests a specific user's logs, allow it
    if user_id and "COACH" in current_user.role.upper():
        target_id = user_id
    
    logs = (
        db.query(SessionLog)
        .filter(SessionLog.user_id == target_id)
        .options(joinedload(SessionLog.drill_performances))
        .order_by(SessionLog.date.desc())
        .all()
    )
    
    return logs