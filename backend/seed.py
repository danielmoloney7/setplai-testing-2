from app.core.database import SessionLocal, engine, Base
# ✅ IMPORTS
from app.models.user import User
from app.models.training import Drill, Program, ProgramSession, ProgramAssignment
from app.core.security import get_password_hash
import datetime
import uuid

db = SessionLocal()

def seed_data():
    print("🌱 Seeding Data...")
    
    # ⚠️ CRITICAL: Drop all tables to apply the Schema Change (Int -> String IDs)
    # This deletes old data to fix the 422 mismatch error and ensures clean String IDs.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # --- 1. Seed Drills ---
    # Using explicit IDs helps with debugging, but the model handles UUIDs automatically too.
    drills = [
        Drill(id="drill_1", name="Wide Serve Targeting", category="Serve", difficulty="Intermediate", description="Hit 10 serves to the deuce wide corner.", default_duration_min=15),
        Drill(id="drill_2", name="Cross-Court Forehand", category="Forehand", difficulty="Intermediate", description="Sustain a cross-court rally for 20 balls.", default_duration_min=10),
        Drill(id="drill_3", name="Spider Drill", category="Footwork", difficulty="Advanced", description="Sprint from center mark to corners and back.", default_duration_min=10),
        Drill(id="drill_4", name="Dynamic Warmup", category="Warmup", difficulty="Beginner", description="Jogging, high knees, side shuffles.", default_duration_min=10),
        Drill(id="drill_5", name="Volley Reactions", category="Volley", difficulty="Advanced", description="Rapid fire volleys at the net.", default_duration_min=5),
    ]
    db.add_all(drills)
    db.commit()
    print("   ✅ Drills added.")
    
    # --- 2. Seed Users ---
    # Create Coach with explicit string ID
    coach_id = "user_coach_1"
    coach = User(
        id=coach_id,
        email="coach@test.com", 
        hashed_password=get_password_hash("password"), 
        role="COACH", 
        name="Coach Williams"
    )
    db.add(coach)
    
    # Create Players linked to Coach
    p1 = User(
        id="user_rafa",
        email="rafa@test.com", 
        hashed_password=get_password_hash("password"), 
        role="PLAYER", 
        name="Rafael N.", 
        coach_id=coach_id
    )
    p2 = User(
        id="user_serena",
        email="serena@test.com", 
        hashed_password=get_password_hash("password"), 
        role="PLAYER", 
        name="Serena W.", 
        coach_id=coach_id
    )
    db.add_all([p1, p2])
    db.commit()
    print("   ✅ Users added.")

    # --- 3. Seed Program & Assignments ---
    program_id = "prog_baseline"
    program = Program(
        id=program_id,
        title="Pre-Season Baseline",
        description="A 4-week foundation program focusing on consistency and footwork.",
        creator_id=coach_id
    )
    db.add(program)

    # Add Sessions linked to Program
    sessions = [
        # Day 1
        ProgramSession(program_id=program_id, day_order=1, drill_name="Dynamic Warmup", duration_minutes=10, notes="Focus on form"),
        ProgramSession(program_id=program_id, day_order=1, drill_name="Cross-Court Forehand", duration_minutes=15, notes="Keep depth"),
        ProgramSession(program_id=program_id, day_order=1, drill_name="Spider Drill", duration_minutes=10, notes="High intensity"),
        # Day 2
        ProgramSession(program_id=program_id, day_order=2, drill_name="Dynamic Warmup", duration_minutes=10, notes="Warm up loose"),
        ProgramSession(program_id=program_id, day_order=2, drill_name="Wide Serve Targeting", duration_minutes=20, notes="Hit your spots")
    ]
    db.add_all(sessions)
    
    # Assign to Players
    assignments = [
        ProgramAssignment(
            program_id=program_id,
            coach_id=coach_id,
            player_id="user_rafa",
            status="ACTIVE",
            assigned_at=datetime.datetime.utcnow()
        ),
        ProgramAssignment(
            program_id=program_id,
            coach_id=coach_id,
            player_id="user_serena",
            status="ACTIVE",
            assigned_at=datetime.datetime.utcnow()
        )
    ]
    db.add_all(assignments)
    
    db.commit()
    print("   ✅ Program 'Pre-Season Baseline' created and assigned.")

    db.close()
    print("🏁 Seeding Complete.")

if __name__ == "__main__":
    seed_data()