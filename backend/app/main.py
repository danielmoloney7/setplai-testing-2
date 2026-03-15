from fastapi import FastAPI, APIRouter, HTTPException
from app.core.database import engine, Base
from app.api.v1 import auth, training, squads, matches, notifications  # <--- IMPORT TRAINING ROUTER here
from fastapi.middleware.cors import CORSMiddleware

# --- IMPORT MODELS HERE (Crucial for creating tables) ---
from app.models import user, training as training_models 

from fastapi.staticfiles import StaticFiles
from app.api.v1 import technique # <--- IMPORT NEW ROUTER
from app.models import technique as technique_models

import os
import boto3
import uuid

# Create all tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI()

os.makedirs("static", exist_ok=True) # Ensure it exists
app.mount("/static", StaticFiles(directory="static"), name="static")

# ✅ NEW: Ensure uploads directory exists and mount it for session photos
os.makedirs("uploads", exist_ok=True) 
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
app.include_router(technique.router, prefix="/api/v1/technique", tags=["Technique"])

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
    
@app.get("/api/v1/media/upload-url")
def get_presigned_url(file_type: str = "video/mp4"):

    BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

    try:
        ext = file_type.split('/')[-1]
        unique_filename = f"{uuid.uuid4()}.{ext}"

        s3_client = boto3.client("s3", region_name = "eu-west-1")

        presigned_url = s3_client.generate_presigned_url(
            "put_object",
            Params = {
                "Bucket": BUCKET_NAME,
                "Key": unique_filename,
                "ContentType": file_type
            },
            ExpiresIn = 3600
        )
        
        return {
            "upload_url": presigned_url,
            "file_path": f"/{unique_filename}"
        }
        
    except Exception as e:
        raise HTTPException(status_code = 500, detail = str(e))