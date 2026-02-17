from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app.core.database import get_db
from app.models.user import User
from app.core.security import get_password_hash, verify_password, create_access_token
from pydantic import BaseModel
from typing import Optional
import random

router = APIRouter()

# Schema for Registration
class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "player"
    age: Optional[int] = None
    years_experience: Optional[int] = 0
    level: Optional[str] = "Beginner"
    goals: Optional[str] = None

def generate_coach_code():
    """Generates a random 6-digit string"""
    return str(random.randint(100000, 999999))

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # 1. Check if email exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Generate Code if Coach
    coach_code = None
    if user.role.lower() == "coach":
        coach_code = generate_coach_code()
        # Ensure uniqueness (simple check)
        while db.query(User).filter(User.coach_code == coach_code).first():
            coach_code = generate_coach_code()

    # 3. Hash password and save
    hashed_pwd = get_password_hash(user.password)
    new_user = User(
        email=user.email, 
        hashed_password=hashed_pwd, 
        role=user.role,
        age=user.age,
        years_experience=user.years_experience,
        level=user.level,
        goals=user.goals,
        name=user.email.split('@')[0],
        coach_code=coach_code # ✅ Save the code
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "id": new_user.id}

@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "name": user.email.split("@")[0],
        "id": user.id
    }