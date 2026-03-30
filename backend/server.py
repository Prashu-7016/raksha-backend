from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

app = FastAPI()

# ✅ CORS (VERY IMPORTANT)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 📦 MODELS
# =========================

class RegisterRequest(BaseModel):
    seed_hash: str
    device_salt: str

class LoginRequest(BaseModel):
    seed_hash: str
    device_salt: str

class IncidentReport(BaseModel):
    seed_hash: str
    location: dict
    category: str
    severity: int
    description: Optional[str] = None

# =========================
# 🧠 TEMP DATABASE
# =========================

users = {}
incidents = []

# =========================
# 🔐 AUTH
# =========================

@app.post("/api/auth/register")
async def register(data: RegisterRequest):
    if data.seed_hash in users:
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = str(uuid.uuid4())

    users[data.seed_hash] = {
        "user_id": user_id,
        "device_salt": data.device_salt,
        "created_at": datetime.utcnow()
    }

    return {
        "user_id": user_id,
        "message": "User registered successfully"
    }


@app.post("/api/auth/login")
async def login(data: LoginRequest):
    user = users.get(data.seed_hash)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user["user_id"],
        "message": "Login successful"
    }

# =========================
# 🚨 INCIDENTS
# =========================

@app.post("/api/incidents/report")
async def report_incident(data: IncidentReport):
    incidents.append({
        "id": str(uuid.uuid4()),
        "data": data.dict(),
        "timestamp": datetime.utcnow()
    })

    return {"message": "Incident reported"}

@app.post("/api/incidents/heatmap")
async def heatmap():
    return {"data": incidents}

@app.get("/api/incidents/risk-score")
async def risk_score(lat: float, lng: float, radius: float):
    return {"risk_score": 0.5}

@app.post("/api/zones/danger-zones")
async def danger_zones():
    return {"zones": []}

# =========================
# HEALTH CHECK
# =========================

@app.get("/")
async def root():
    return {"status": "Backend running"}

@app.get("/health")
async def health():
    return {"status": "ok"}
