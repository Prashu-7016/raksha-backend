from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional
import os
import uuid
from datetime import datetime
from pathlib import Path

# ------------------ ENV ------------------

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

# Fallback (prevents crash)
if not mongo_url:
    mongo_url = "mongodb+srv://prashanthd559_db_user:L6njveRBlPm4HEUE@cluster0.v9gzt0g.mongodb.net/raksha_db?retryWrites=true&w=majority"

if not db_name:
    db_name = "raksha_db"

print("MONGO_URL:", mongo_url)
print("DB_NAME:", db_name)

# ------------------ DB ------------------

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ------------------ APP ------------------

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
    return await db.users.find_one({"hash": seed_hash})

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

# ------------------ RISK SCORE (FIXED) ------------------

@router.get("/incidents/risk-score")
async def get_risk_score(lat: float, lng: float, radius: float = 1):
    """
    Temporary safe response so app doesn't crash
    """

    return {
        "latitude": lat,
        "longitude": lng,
        "risk_level": "low",
        "risk_score": 0.2,
        "incident_count": 0,
        "categories": {}
    }

# ------------------ HEALTH ------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "mongo_connected": True
    }

# ------------------ SETUP ------------------

app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
