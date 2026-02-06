from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Squad, SquadMember

router = APIRouter()

# --- SCHEMAS ---
class SquadCreate(BaseModel):
    name: str
    level: Optional[str] = "Mixed"
    initial_members: List[str] = []  # ✅ New field for selecting athletes

class AddMemberRequest(BaseModel):
    player_id: str

class SquadResponse(BaseModel):
    id: str
    name: str
    level: Optional[str]
    member_count: int

# --- ENDPOINTS ---

@router.get("/", response_model=List[SquadResponse])
def get_my_squads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "COACH":
        raise HTTPException(403, "Only coaches can view squads.")
    
    squads = db.query(Squad).filter(Squad.coach_id == current_user.id).all()
    
    return [
        {"id": s.id, "name": s.name, "level": s.level, "member_count": len(s.members)}
        for s in squads
    ]

@router.post("/")
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