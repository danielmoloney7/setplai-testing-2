from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.training import Drill, Program, ProgramAssignment, ProgramSession, SessionLog, DrillPerformance, generate_id
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()

# =======================
# 1. PYDANTIC SCHEMAS
# =======================

# --- Basic Schemas ---
class DrillItemSchema(BaseModel):
    drill_name: str
    duration: int
    notes: Optional[str] = None

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
    status: str  # 'ACTIVE', 'DECLINED', 'ARCHIVED'

# --- Session Logging Schemas ---
class DrillPerformanceCreate(BaseModel):
    drill_id: str
    outcome: str
    achieved_value: Optional[int] = None

class DrillPerformanceSchema(DrillPerformanceCreate):
    id: str
    class Config:
        orm_mode = True

class SessionLogCreate(BaseModel):
    program_id: Optional[str] = None 
    session_day_order: Optional[int] = None
    duration_minutes: int
    rpe: int
    notes: Optional[str] = None
    drill_performances: List[DrillPerformanceCreate] = []

class SessionLogSchema(SessionLogCreate):
    id: str
    date_completed: datetime 
    drill_performances: List[DrillPerformanceSchema] = []
    
    class Config:
        orm_mode = True

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    class Config:
        from_attributes = True

class UserUpdateSchema(BaseModel):
    goals: List[str]

# =======================
# 2. ENDPOINTS
# =======================

# --- 1. SEED DRILLS ---
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

# --- 2. GET ALL PROGRAMS (Fixed for Status Logic) ---
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
            # Determine Status
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

            # Fetch Relations Manually
            assignments = db.query(ProgramAssignment).filter(ProgramAssignment.program_id == p.id).all()
            assigned_ids = [a.player_id for a in assignments]

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
                "assigned_to": assigned_ids,
                "schedule": [
                    {
                        "day_order": s.day_order,
                        "drill_name": s.drill_name,
                        "duration_minutes": s.duration_minutes,
                        "notes": s.notes
                    } for s in sessions
                ]
            })
        return results
    except Exception as e:
        print(f"Error fetching programs: {e}")
        raise HTTPException(500, f"Failed to fetch programs: {str(e)}")

# --- 3. CREATE PROGRAM (FIXED: Handles Self-Assignment & Active Status) ---
@router.post("/programs")
def create_program(
    program_in: ProgramCreateSchema, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"DEBUG: Received Program: {program_in.title}") # Debug print

        # 1. Create Program
        new_program = Program(
            title=program_in.title,
            description=program_in.description,
            creator_id=current_user.id,
            # created_at is usually auto-handled by DB, but we can set it explicitly if needed
            created_at=datetime.utcnow() 
        )
        db.add(new_program)
        db.commit()
        db.refresh(new_program)
        print(f"DEBUG: Created Program ID: {new_program.id}")

        # 2. Add Sessions
        for sess in program_in.sessions:
            for drill in sess.drills: 
                db_session = ProgramSession(
                    program_id=new_program.id,
                    day_order=sess.day,
                    drill_name=drill.drill_name,
                    duration_minutes=drill.duration,
                    notes=drill.notes or ""
                )
                db.add(db_session)

        # 3. Create Assignment
        targets = program_in.assigned_to
        
        # Default to SELF if empty
        if not targets or "SELF" in targets:
            targets = [str(current_user.id)] # Ensure string for consistency in loop

        for player_id_str in targets:
            if str(player_id_str).startswith("sq") or player_id_str == "SELF": 
                continue 
            
            # DETERMINING STATUS
            final_status = "PENDING"
            
            # Safe Integer Compare
            try:
                if int(player_id_str) == current_user.id:
                    final_status = "ACTIVE"
            except ValueError:
                # If ID is not an int (e.g. UUID), assume it's valid but compare differently if needed
                if str(player_id_str) == str(current_user.id):
                    final_status = "ACTIVE"

            if program_in.status == "ACTIVE":
                final_status = "ACTIVE"

            assignment = ProgramAssignment(
                program_id=new_program.id,
                player_id=int(player_id_str) if str(player_id_str).isdigit() else player_id_str, # Handle Int vs String IDs
                coach_id=current_user.id,
                status=final_status,
                assigned_at=datetime.utcnow()
            )
            db.add(assignment)

        db.commit()
        print("DEBUG: Successfully committed all records.")
        return {"status": "success", "program_id": new_program.id}

    except Exception as e:
        db.rollback() 
        print(f"CRITICAL ERROR in create_program: {e}") # <--- LOOK AT YOUR TERMINAL FOR THIS
        # Import traceback to see line number
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
    
# --- 4. GET ACTIVE PROGRAM (The "Dashboard" Check) ---
@router.get("/my-active-program")
def get_my_active_program(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the most recent ACTIVE assignment
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
        "id": program.id, # Important for tracking
        "title": program.title,
        "description": program.description,
        "coach_name": coach.name if coach else "Coach",
        "assigned_at": assignment.assigned_at,
        "schedule": sessions_data 
    }

# --- 5. UPDATE STATUS (Accept/Decline) ---
@router.patch("/programs/{program_id}/status")
def update_program_status(
    program_id: int,
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

# --- 6. MISC ENDPOINTS ---
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
        session_id=session_data.session_day_order,
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
    db.commit()
    return {"status": "success", "log_id": new_log.id}

@router.get("/my-session-logs", response_model=List[SessionLogSchema])
def get_my_session_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SessionLog).filter(SessionLog.player_id == current_user.id).order_by(desc(SessionLog.date_completed)).all()

@router.put("/my-profile")
def update_my_profile(profile_data: UserUpdateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.goals = ",".join(profile_data.goals) 
    db.commit()
    return {"status": "success", "goals": current_user.goals}

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    return [] # Simplified for now