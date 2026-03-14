"""
MongoDB connection using Motor (async driver)
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

_client: AsyncIOMotorClient = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URL)
    return _client


def get_database():
    return get_client()[settings.MONGODB_DB]


# Collection helpers
def get_collection(name: str):
    return get_database()[name]


# Named collection accessors
def users_col():
    return get_collection("users")

def potholes_col():
    return get_collection("potholes")

def roads_col():
    return get_collection("roads")

def complaints_col():
    return get_collection("complaints")

def contractors_col():
    return get_collection("contractors")

def repairs_col():
    return get_collection("repairs")

def blockchain_col():
    return get_collection("blockchain_records")

def detection_jobs_col():
    return get_collection("detection_jobs")

def issues_col():
    return get_collection("issues")

def alerts_col():
    return get_collection("alerts")

def districts_col():
    return get_collection("districts")

def risk_scores_col():
    return get_collection("risk_scores")

def predictions_col():
    return get_collection("predictions")

def budget_col():
    return get_collection("budget_records")

def audit_logs_col():
    return get_collection("audit_logs")

def notifications_col():
    return get_collection("notifications")

def citizen_votes_col():
    return get_collection("citizen_votes")

def citizen_rewards_col():
    return get_collection("citizen_rewards")

def reputation_col():
    return get_collection("reputation_scores")


def city_admins_col():
    return get_collection("city_admins")

def detection_logs_col():
    return get_collection("detection_logs")

def system_logs_col():
    return get_collection("system_logs")


def pipeline_logs_col():
    return get_collection("pipeline_logs")

def dashboard_stats_col():
    return get_collection("dashboard_stats")


async def connect_db():
    """Initialize MongoDB connection and create indexes."""
    db = get_database()
    # Indexes
    await db["users"].create_index("email", unique=True)
    await db["potholes"].create_index("detection_id", unique=True)
    await db["potholes"].create_index([("latitude", 1), ("longitude", 1)])
    await db["potholes"].create_index("severity")
    await db["potholes"].create_index("is_active")
    await db["potholes"].create_index("pipeline_stage")
    await db["complaints"].create_index("complaint_number", unique=True, sparse=True)
    await db["complaints"].create_index([("reported_by", 1), ("status", 1)])
    await db["repairs"].create_index("repair_number", unique=True, sparse=True)
    await db["blockchain_records"].create_index("transaction_hash", unique=True)
    await db["pipeline_logs"].create_index([("pothole_id", 1), ("stage", 1)])
    await db["issues"].create_index("issue_id", unique=True)
    await db["issues"].create_index([("latitude", 1), ("longitude", 1)])
    await db["issues"].create_index("severity")
    await db["issues"].create_index("district")
    await db["alerts"].create_index("alert_id", unique=True)
    await db["alerts"].create_index("severity")
    await db["alerts"].create_index("district")
    await db["districts"].create_index("district", unique=True)
    await db["citizen_rewards"].create_index("user_id", unique=True)
    await db["citizen_rewards"].create_index([("reports_verified", -1), ("tokens_earned", -1)])
    await db["notifications"].create_index([("recipient_user_id", 1), ("created_at", -1)])


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None
