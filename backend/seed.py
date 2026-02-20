from app.core.database import SessionLocal, engine, Base
from app.models.user import User, Squad, SquadMember
from app.models.training import Drill, Program, ProgramSession, ProgramAssignment
from app.models.technique import ProVideo, UserVideo, Analysis
from app.core.security import get_password_hash
import datetime
import uuid

db = SessionLocal()

def seed_data():
    print("🌱 Seeding Data...")
    
    # 1. Reset Database (This drops old tables and creates the new ones with your new columns!)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # --- USERS ---
    coach_id = "user_coach_1"
    coach = User(
        id=coach_id, 
        email="coach@test.com", 
        hashed_password=get_password_hash("daniel"), 
        role="COACH", 
        name="Coach Williams", 
        coach_code="123456",
        xp=5000
    )
    
    p1 = User(
        id="user_rafa", 
        email="rafa@test.com", 
        hashed_password=get_password_hash("daniel"), 
        role="PLAYER", 
        name="Rafael N.", 
        coach_id=coach_id, 
        coach_link_status="ACTIVE",
        xp=1200
    )
    
    db.add_all([coach, p1])
    db.commit()
    print("   ✅ Users added.")

    # --- SQUADS ---
    squad = Squad(
        id="sq_1",
        name="Varsity A-Team",
        coach_id=coach_id,
    )
    db.add(squad)
    db.commit()
    
    squad_member = SquadMember(
        id="sqm_1",
        squad_id="sq_1",
        player_id="user_rafa"
    )
    db.add(squad_member)
    db.commit()
    print("   ✅ Squads added.")

    # --- DRILLS ---
    drills = [
        Drill(id="d1", name="Wide Serve Targeting", category="Serve", difficulty="Intermediate", description="Hit 10 serves to the deuce wide corner.", target_value=10, default_duration_min=15, video_url="https://media.giphy.com/media/3o6Zt8qDiPE2d3kAzA/giphy.gif"),
        Drill(id="d2", name="T-Serve Precision", category="Serve", difficulty="Advanced", description="Focus on hitting the T-line.", target_value=10, default_duration_min=15, video_url="https://media.giphy.com/media/l0HlJDaeqNXVcWWfq/giphy.gif"),
        Drill(id="d3", name="Cross-Court Forehand", category="Forehand", difficulty="Intermediate", description="Sustain a cross-court rally.", target_value=20, default_duration_min=10, video_url="https://media.giphy.com/media/3o7TKrEzvJbsQNtF5u/giphy.gif"),
    ]
    db.add_all(drills)
    db.commit()
    print("   ✅ Drills added.")

    # --- SAMPLE SQUAD PROGRAM WITH TACTICS DIAGRAM ---
    squad_program = Program(
        id="prog_squad_1",
        title="Saturday Tactics & Positioning",
        description="Focusing on court control and movement.",
        creator_id=coach_id,
        program_type="SQUAD_SESSION",
        squad_id="sq_1",
        status="ACTIVE"
    )
    db.add(squad_program)
    db.commit()

    squad_session = ProgramSession(
        id="sess_1",
        program_id="prog_squad_1",
        day_order=1,
        drill_id="d3",
        drill_name="Cross-Court Attack Strategy",
        duration_minutes=20,
        notes="Look at the attached diagram. Move the opponent off the court!",
        # ✅ Here is a sample URL testing the image rendering logic we built!
        media_url="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop" 
    )
    db.add(squad_session)
    db.commit()
    print("   ✅ Squad Session with Diagram added.")

    # --- PRO TECHNIQUE LIBRARY ---
    pro_videos = [
        ProVideo(id="pv_1", player_name="Roger F.", shot_type="Forehand", handedness="Right", tags="Topspin, Whip", video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", thumbnail_url="https://media.giphy.com/media/3o7TKrEzvJbsQNtF5u/giphy.gif"),
        ProVideo(id="pv_2", player_name="Serena W.", shot_type="Serve", handedness="Right", tags="Power, Flat", video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", thumbnail_url="https://media.giphy.com/media/l0HlJDaeqNXVcWWfq/giphy.gif"),
        ProVideo(id="pv_3", player_name="Rafa N.", shot_type="Backhand", handedness="Left", tags="Two-Handed, Spin", video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", thumbnail_url="https://media.giphy.com/media/xT9IgMw9fupOgFb7yM/giphy.gif")
    ]
    db.add_all(pro_videos)
    
    # --- USER UPLOADS ---
    user_videos = [
        UserVideo(id="uv_1", user_id="user_rafa", title="My Practice Serve", video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", shot_type="Serve"),
        UserVideo(id="uv_2", user_id="user_rafa", title="Forehand Analysis", video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", shot_type="Forehand"),
        UserVideo(id="uv_3", user_id="user_coach_1", title="Demo for Students", video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", shot_type="Drill")
    ]
    db.add_all(user_videos)
    db.commit()
    print("   ✅ Videos added.")

    db.close()
    print("🚀 Seeding Complete!")

if __name__ == "__main__":
    seed_data()