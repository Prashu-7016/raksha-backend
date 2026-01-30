from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import hashlib
import math
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create geospatial index for incidents
async def create_indexes():
    try:
        await db.incidents.create_index([("location", "2dsphere")])
        await db.incidents.create_index([("rounded_location", "2dsphere")])
        logging.info("Geospatial indexes created successfully")
    except Exception as e:
        logging.error(f"Error creating indexes: {e}")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# MODELS
class RegisterRequest(BaseModel):
    seed_hash: str  # SHA-256 hash of seed phrase + device salt
    device_salt: str  # Unique device identifier

class RegisterResponse(BaseModel):
    user_id: str
    created_at: datetime

class LoginRequest(BaseModel):
    seed_hash: str
    device_salt: str

class LoginResponse(BaseModel):
    user_id: str
    success: bool

class Location(BaseModel):
    latitude: float
    longitude: float

class IncidentReport(BaseModel):
    seed_hash: str  # For authentication
    location: Location
    category: str  # harassment, stalking, unsafe_crowd, eve_teasing, suspicious_activity, other
    severity: int = Field(ge=1, le=5)  # 1-5
    description: Optional[str] = None

class IncidentResponse(BaseModel):
    incident_id: str
    status: str
    message: str

class HeatmapBounds(BaseModel):
    min_lat: float
    max_lat: float
    min_lng: float
    max_lng: float

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float
    category: str
    severity: int
    timestamp: datetime

class RiskZone(BaseModel):
    zone_id: str
    center: Location
    radius: float  # in meters
    risk_level: str  # high, medium, low
    incident_count: int
    avg_severity: float

# UTILITY FUNCTIONS
def round_coordinates(lat: float, lng: float, precision: int = 3) -> tuple:
    """Round coordinates to reduce precision for privacy (approx 100m accuracy)"""
    return (round(lat, precision), round(lng, precision))

def calculate_time_decay_weight(timestamp: datetime, decay_days: int = 30) -> float:
    """Calculate weight based on age of incident (newer = higher weight)"""
    age_days = (datetime.utcnow() - timestamp).days
    if age_days > decay_days * 3:
        return 0.1  # Very old
    elif age_days > decay_days * 2:
        return 0.3
    elif age_days > decay_days:
        return 0.6
    else:
        return 1.0  # Recent

async def verify_user(seed_hash: str) -> Optional[str]:
    """Verify user exists and return user_id"""
    user = await db.users.find_one({"hash": seed_hash})
    if user:
        return user["user_id"]
    return None

async def moderate_with_ai(description: str, category: str) -> Dict[str, Any]:
    """Use Gemini AI to moderate incident reports"""
    try:
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            logging.warning("EMERGENT_LLM_KEY not found, skipping AI moderation")
            return {"approved": True, "confidence": 0.5, "reason": "No AI moderation"}
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"moderation_{uuid.uuid4()}",
            system_message="""You are a content moderator for a women's safety app. 
            Analyze incident reports for:
            1. Spam or fake reports
            2. Abusive or inappropriate language
            3. Duplicate/low-quality reports
            4. Legitimate safety concerns
            
            Respond ONLY with a JSON object:
            {"approved": true/false, "confidence": 0.0-1.0, "reason": "brief explanation"}"""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        message = UserMessage(text=f"Category: {category}\nDescription: {description or 'No description'}\n\nIs this a legitimate safety report?")
        response = await chat.send_message(message)
        
        # Parse AI response
        import json
        try:
            result = json.loads(response)
            return result
        except:
            # Fallback if AI doesn't return proper JSON
            if "approved" in response.lower() and "true" in response.lower():
                return {"approved": True, "confidence": 0.7, "reason": "AI approved"}
            else:
                return {"approved": False, "confidence": 0.7, "reason": "AI rejected"}
    
    except Exception as e:
        logging.error(f"AI moderation error: {e}")
        # Default to approval if AI fails
        return {"approved": True, "confidence": 0.5, "reason": f"AI error: {str(e)}"}

# AUTHENTICATION ENDPOINTS
@api_router.post("/auth/register", response_model=RegisterResponse)
async def register_user(request: RegisterRequest):
    """Register a new user with seed phrase hash"""
    # Check if user already exists
    existing = await db.users.find_one({"hash": request.seed_hash})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "user_id": user_id,
        "hash": request.seed_hash,
        "device_salt": request.device_salt,
        "created_at": datetime.utcnow(),
        "last_login": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    
    return RegisterResponse(
        user_id=user_id,
        created_at=user_doc["created_at"]
    )

@api_router.post("/auth/login", response_model=LoginResponse)
async def login_user(request: LoginRequest):
    """Login user with seed phrase hash"""
    user = await db.users.find_one({"hash": request.seed_hash})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    return LoginResponse(
        user_id=user["user_id"],
        success=True
    )

# INCIDENT REPORTING ENDPOINTS
@api_router.post("/incidents/report", response_model=IncidentResponse)
async def report_incident(request: IncidentReport, background_tasks: BackgroundTasks):
    """Submit an anonymous incident report"""
    # Verify user
    user_id = await verify_user(request.seed_hash)
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    # Round coordinates for privacy
    rounded_lat, rounded_lng = round_coordinates(
        request.location.latitude,
        request.location.longitude
    )
    
    incident_id = str(uuid.uuid4())
    
    # Create incident document
    incident_doc = {
        "incident_id": incident_id,
        "user_id": user_id,  # Will be removed after moderation
        "location": {
            "type": "Point",
            "coordinates": [request.location.longitude, request.location.latitude]
        },
        "rounded_location": {
            "type": "Point",
            "coordinates": [rounded_lng, rounded_lat]
        },
        "category": request.category,
        "severity": request.severity,
        "description": request.description,
        "timestamp": datetime.utcnow(),
        "moderation_status": "pending",
        "confidence_score": 0.5,
        "is_anonymous": False,
        "created_at": datetime.utcnow()
    }
    
    await db.incidents.insert_one(incident_doc)
    
    # Run AI moderation in background
    background_tasks.add_task(moderate_incident, incident_id, request.description or "", request.category)
    
    return IncidentResponse(
        incident_id=incident_id,
        status="pending",
        message="Report submitted successfully. Under moderation."
    )

async def moderate_incident(incident_id: str, description: str, category: str):
    """Background task to moderate incident with AI"""
    try:
        # Get AI moderation result
        moderation = await moderate_with_ai(description, category)
        
        # Update incident
        update_data = {
            "moderation_status": "approved" if moderation["approved"] else "rejected",
            "confidence_score": moderation["confidence"]
        }
        
        # If approved, anonymize by removing user_id
        if moderation["approved"]:
            update_data["is_anonymous"] = True
            update_data["user_id"] = None  # Remove user link for privacy
        
        await db.incidents.update_one(
            {"incident_id": incident_id},
            {"$set": update_data}
        )
        
        # Log moderation
        await db.moderation_logs.insert_one({
            "log_id": str(uuid.uuid4()),
            "incident_id": incident_id,
            "ai_analysis": moderation,
            "decision": moderation["approved"],
            "timestamp": datetime.utcnow()
        })
        
    except Exception as e:
        logging.error(f"Moderation error for incident {incident_id}: {e}")

# MAP & HEATMAP ENDPOINTS
@api_router.post("/incidents/heatmap")
async def get_heatmap_data(bounds: HeatmapBounds):
    """Get incident data for heatmap within bounds"""
    # Query incidents within bounds (approved only)
    incidents = await db.incidents.find(
        {
            "moderation_status": "approved",
            "rounded_location.coordinates.1": {"$gte": bounds.min_lat, "$lte": bounds.max_lat},
            "rounded_location.coordinates.0": {"$gte": bounds.min_lng, "$lte": bounds.max_lng}
        },
        {
            "rounded_location": 1,
            "severity": 1,
            "category": 1,
            "timestamp": 1,
            "_id": 0
        }
    ).to_list(1000)
    
    # Convert to heatmap points with time decay
    heatmap_points = []
    for inc in incidents:
        weight = calculate_time_decay_weight(inc["timestamp"])
        weight *= (inc["severity"] / 5.0)  # Factor in severity
        
        heatmap_points.append({
            "latitude": inc["rounded_location"]["coordinates"][1],
            "longitude": inc["rounded_location"]["coordinates"][0],
            "weight": weight,
            "category": inc["category"],
            "severity": inc["severity"],
            "timestamp": inc["timestamp"]
        })
    
    return {"points": heatmap_points, "count": len(heatmap_points)}

@api_router.get("/incidents/risk-score")
async def get_risk_score(lat: float, lng: float, radius_km: float = 1.0):
    """Calculate risk score for a location"""
    # Convert km to meters
    radius_meters = radius_km * 1000
    
    # Find incidents near location using geospatial query
    incidents = await db.incidents.find(
        {
            "moderation_status": "approved",
            "rounded_location": {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]
                    },
                    "$maxDistance": radius_meters
                }
            }
        },
        {
            "severity": 1,
            "category": 1,
            "timestamp": 1,
            "_id": 0
        }
    ).to_list(100)
    
    if not incidents:
        return {
            "latitude": lat,
            "longitude": lng,
            "risk_level": "safe",
            "risk_score": 0.0,
            "incident_count": 0,
            "categories": {}
        }
    
    # Calculate weighted risk score
    total_weight = 0
    category_counts = {}
    
    for inc in incidents:
        weight = calculate_time_decay_weight(inc["timestamp"])
        weight *= (inc["severity"] / 5.0)
        total_weight += weight
        
        cat = inc["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    # Normalize risk score (0-1)
    risk_score = min(total_weight / 10.0, 1.0)
    
    # Determine risk level
    if risk_score > 0.7:
        risk_level = "high"
    elif risk_score > 0.4:
        risk_level = "medium"
    elif risk_score > 0.1:
        risk_level = "low"
    else:
        risk_level = "safe"
    
    return {
        "latitude": lat,
        "longitude": lng,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "incident_count": len(incidents),
        "categories": category_counts
    }

@api_router.post("/zones/danger-zones")
async def get_danger_zones(bounds: HeatmapBounds):
    """Identify high-risk zones within bounds"""
    # Get all incidents in area
    incidents = await db.incidents.find(
        {
            "moderation_status": "approved",
            "rounded_location.coordinates.1": {"$gte": bounds.min_lat, "$lte": bounds.max_lat},
            "rounded_location.coordinates.0": {"$gte": bounds.min_lng, "$lte": bounds.max_lng}
        },
        {
            "rounded_location": 1,
            "severity": 1,
            "category": 1,
            "timestamp": 1,
            "_id": 0
        }
    ).to_list(1000)
    
    # Cluster incidents by rounded location
    location_clusters = {}
    for inc in incidents:
        loc_key = f"{inc['rounded_location']['coordinates'][1]},{inc['rounded_location']['coordinates'][0]}"
        if loc_key not in location_clusters:
            location_clusters[loc_key] = []
        location_clusters[loc_key].append(inc)
    
    # Create danger zones
    danger_zones = []
    for loc_key, cluster in location_clusters.items():
        if len(cluster) < 3:  # Need at least 3 incidents
            continue
        
        lat, lng = map(float, loc_key.split(','))
        avg_severity = sum(inc["severity"] for inc in cluster) / len(cluster)
        
        # Calculate weighted risk
        total_weight = sum(
            calculate_time_decay_weight(inc["timestamp"]) * (inc["severity"] / 5.0)
            for inc in cluster
        )
        
        risk_level = "high" if total_weight > 5 else "medium" if total_weight > 2 else "low"
        
        danger_zones.append({
            "zone_id": str(uuid.uuid4()),
            "center": {"latitude": lat, "longitude": lng},
            "radius": 500,  # 500 meter radius
            "risk_level": risk_level,
            "incident_count": len(cluster),
            "avg_severity": avg_severity
        })
    
    return {"zones": danger_zones}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "women-safety-api"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await create_indexes()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
