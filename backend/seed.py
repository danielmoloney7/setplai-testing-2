from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.training import Drill, Program, ProgramSession, ProgramAssignment
from app.core.security import get_password_hash
import datetime
import uuid

db = SessionLocal()

def seed_data():
    print("🌱 Seeding Data...")
    
    # Drop and recreate tables to ensure new 'xp' column is added
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # --- 1. Rich Drills (From Legacy App) ---
    drills = [
        Drill(id="d1", name="Wide Serve Targeting", category="Serve", difficulty="Intermediate", 
              description="Hit 10 serves to the deuce wide corner, then 10 to ad wide.", 
              target_value = 10,
              default_duration_min=15, video_url="https://media.giphy.com/media/3o6Zt8qDiPE2d3kAzA/giphy.gif"),
        
        Drill(id="d2", name="T-Serve Precision", category="Serve", difficulty="Advanced", 
              description="Focus on hitting the T-line. 20 reps each side.", 
              target_value = 10,
              default_duration_min=15, video_url="https://media.giphy.com/media/l0HlJDaeqNXVcWWfq/giphy.gif"),

        Drill(id="d3", name="Cross-Court Forehand Rally", category="Forehand", difficulty="Intermediate", 
              description="Sustain a cross-court rally for 20 balls without error.", 
              target_value = 20,
              default_duration_min=10, video_url="https://media.giphy.com/media/3o7TKrEzvJbsQNtF5u/giphy.gif"),

        Drill(id="d7", name="Volley-Volley Reaction", category="Volley", difficulty="Advanced", 
              description="Rapid fire volleys at the net with a partner or wall.", 
              default_duration_min=8, video_url="https://media.giphy.com/media/3o7TKvxnDibVYwawHC/giphy.gif"),
              
        Drill(id="w1", name="Dynamic Court Sprints", category="Warmup", difficulty="Beginner", 
              description="Jogging, high knees, butt kicks, and side shuffles across the baseline.", 
              default_duration_min=10, video_url="https://media.giphy.com/media/3o7TKy7hIfMZuK2obC/giphy.gif"),
    ]
    db.add_all(drills)
    db.commit()
    print("   ✅ Drills added.")
    
    # --- 2. Users with XP ---
    coach_id = "user_coach_1"
    coach = User(id=coach_id, email="coach@test.com", hashed_password=get_password_hash("daniel"), role="COACH", name="Coach Williams", xp=5000)
    db.add(coach)
    
    p1 = User(id="user_rafa", email="rafa@test.com", hashed_password=get_password_hash("daniel"), role="PLAYER", name="Rafael N.", coach_id=coach_id, xp=1200)
    p2 = User(id="user_serena", email="serena@test.com", hashed_password=get_password_hash("daniel"), role="PLAYER", name="Serena W.", coach_id=coach_id, xp=3400)
    db.add_all([p1, p2])
    db.commit()
    print("   ✅ Users added.")

    # --- 3. Program ---
    program_id = "prog_baseline"
    program = Program(id=program_id, title="Pre-Season Baseline", description="A 4-week foundation program focusing on consistency and footwork.", creator_id=coach_id)
    db.add(program)

    sessions = [
        ProgramSession(program_id=program_id, day_order=1, drill_name="Dynamic Warmup", duration_minutes=10, notes="Focus on form"),
        ProgramSession(program_id=program_id, day_order=1, drill_name="Cross-Court Forehand Rally", duration_minutes=15, target_value = 20, notes="Keep depth"),
        ProgramSession(program_id=program_id, day_order=2, drill_name="Wide Serve Targeting", duration_minutes=20, target_value = 10, notes="Hit your spots")
    ]
    db.add_all(sessions)
    
    # Active Assignments
    assignments = [
        ProgramAssignment(program_id=program_id, coach_id=coach_id, player_id="user_rafa", status="ACTIVE", assigned_at=datetime.datetime.utcnow()),
        ProgramAssignment(program_id=program_id, coach_id=coach_id, player_id="user_serena", status="ACTIVE", assigned_at=datetime.datetime.utcnow())
    ]
    db.add_all(assignments)
    db.commit()
    print("   ✅ Program assigned.")
    db.close()

if __name__ == "__main__":
    seed_data()