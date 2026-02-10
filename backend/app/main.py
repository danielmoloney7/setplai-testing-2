from fastapi import FastAPI
from app.core.database import engine, Base
from app.api.v1 import auth, training, squads, matches, notifications  # <--- IMPORT TRAINING ROUTER here
from fastapi.middleware.cors import CORSMiddleware

# --- IMPORT MODELS HERE (Crucial for creating tables) ---
from app.models import user, training as training_models 


# Create all tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows ALL origins (perfect for dev)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (POST, GET, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Include the routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(training.router, prefix="/api/v1", tags=["training"])
app.include_router(squads.router, prefix="/api/v1/squads", tags=["squads"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["Matches"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])

@app.get("/")
def read_root():
    return {"message": "Tennis App Backend is Live!"}

@app.on_event("startup")
def list_routes():
    print("\n--- 🚀 ACTIVE ROUTES ---")
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"📍 {route.path}")
    print("------------------------\n")