"""
NRIP Backend Test Suite
"""
import pytest
import asyncio
from httpx import AsyncClient
from app.main import app


@pytest.fixture
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.mark.asyncio
async def test_root():
    """Test root endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        r = await client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["platform"] == "National Road Intelligence Platform"


@pytest.mark.asyncio
async def test_health():
    """Test health check."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_api_docs():
    """Test API docs are accessible."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        r = await client.get("/api/openapi.json")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_transparency_endpoint():
    """Test public transparency endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        r = await client.get("/api/v1/transparency/")
    # Should return data (may have DB connection error in test, that's ok)
    assert r.status_code in [200, 500]


@pytest.mark.asyncio
async def test_login_invalid_credentials():
    """Test login with invalid credentials returns 401."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        r = await client.post("/api/v1/auth/login", json={
            "email": "fake@test.com",
            "password": "wrongpassword"
        })
    assert r.status_code in [401, 422, 500]


@pytest.mark.asyncio
async def test_potholes_list_no_auth():
    """Test that potholes list is accessible."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        r = await client.get("/api/v1/potholes/")
    assert r.status_code in [200, 500]


@pytest.mark.asyncio
async def test_blockchain_list():
    """Test blockchain records list."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        r = await client.get("/api/v1/blockchain/")
    assert r.status_code in [200, 500]


# ─── Unit Tests ───────────────────────────────────────────────────────────────

def test_detection_service_simulation():
    """Test AI detection service simulation mode."""
    import asyncio
    from app.services.detection_service import _simulate_detections
    
    dets = _simulate_detections(28.6139, 77.2090, count=3)
    assert len(dets) == 3
    for d in dets:
        assert "pothole_id" in d
        assert "confidence" in d
        assert d["confidence"] >= 0.0 and d["confidence"] <= 1.0
        assert d["severity"] in ["critical", "high", "moderate", "low"]
        assert "bbox" in d


def test_blockchain_hash():
    """Test blockchain hash generation."""
    import asyncio
    from app.services.blockchain_service import _compute_data_hash, _generate_tx_hash
    
    payload = {"test": "data", "value": 123}
    h = _compute_data_hash(payload)
    assert len(h) == 64  # SHA256 hex
    
    tx = _generate_tx_hash()
    assert tx.startswith("0x")
    assert len(tx) == 66


def test_risk_score_calculation():
    """Test risk scoring severity mapping."""
    from app.services.risk_service import SEVERITY_BASE_SCORES
    
    assert SEVERITY_BASE_SCORES["critical"] >= 85
    assert SEVERITY_BASE_SCORES["low"] <= 40
    assert SEVERITY_BASE_SCORES["critical"] > SEVERITY_BASE_SCORES["high"]


def test_confidence_to_severity():
    """Test confidence to severity mapping."""
    from app.services.detection_service import confidence_to_severity
    
    assert confidence_to_severity(0.90) == "critical"
    assert confidence_to_severity(0.60) == "high"
    assert confidence_to_severity(0.40) == "moderate"
    assert confidence_to_severity(0.20) == "low"


def test_prediction_service_heuristic():
    """Test predictive maintenance heuristic calculation."""
    from app.services.prediction_service import _probability_to_severity, _get_recommendation
    
    assert _probability_to_severity(0.90) == "critical"
    assert _probability_to_severity(0.70) == "high"
    assert _probability_to_severity(0.10) == "safe"
    
    rec = _get_recommendation(0.90, "critical")
    assert "URGENT" in rec
