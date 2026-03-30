from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional
import os
import uuid
from datetime import datetime
import logging
from pathlib import Path

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Logging
logging.basicConfig(level=logging.INFO)

# MongoDB
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# App
app = FastAPI()
router = APIRouter(prefix="/api")

# ------------------ MODELS ------------------

class RegisterRequest(BaseModel):
    seed_hash: str
    device_salt: str

class LoginRequest(BaseModel):
    seed_hash: str
    device_salt: str

class Location(BaseModel):
    latitude: float
    longitude: float

class IncidentRequest(BaseModel):
    seed_hash: str
    location: Location
    category: str
    severity: int = Field(ge=1, le=5)
    description: Optional[str] = None

# ------------------ UTILS ------------------

async def verify_user(seed_hash: str):
    user = await db.users.find_one({"hash": seed_hash})
    return user

# ------------------ AUTH ------------------

@router.post("/auth/register")
async def register_user(data: RegisterRequest):
    existing = await db.users.find_one({"hash": data.seed_hash})

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = {
        "user_id": str(uuid.uuid4()),
        "hash": data.seed_hash,
        "device_salt": data.device_salt,
        "created_at": datetime.utcnow()
    }

    await db.users.insert_one(user)

    return {
        "status": "success",
        "user_id": user["user_id"]
    }

@router.post("/auth/login")
async def login_user(data: LoginRequest):
    user = await db.users.find_one({"hash": data.seed_hash})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "status": "success",
        "user_id": user["user_id"]
    }

# ------------------ INCIDENT ------------------

@router.post("/incidents/report")
async def report_incident(data: IncidentRequest):
    user = await verify_user(data.seed_hash)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    incident = {
        "incident_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "location": {
            "type": "Point",
            "coordinates": [data.location.longitude, data.location.latitude]
        },
        "category": data.category,
        "severity": data.severity,
        "description": data.description,
        "timestamp": datetime.utcnow()
    }

    await db.incidents.insert_one(incident)

    return {
        "status": "success",
        "incident_id": incident["incident_id"]
    }

# ------------------ HEALTH ------------------

@app.get("/health")
def health():
    return {"status": "ok"}

# ------------------ SETUP ------------------

app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
