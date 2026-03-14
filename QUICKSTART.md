# National Road Intelligence Platform (NRIP)
# 🚀 Quick Start Guide — Hackathon Demo

## Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (or Docker)
- Redis (or Docker)

---

## Option A: Docker (Recommended — 1 Command)

```bash
# Copy environment file
cp .env.example .env

# Start everything
docker-compose up -d

# Apply database schema
docker exec nrip-postgres psql -U nrip_user -d nrip_db \
  -f /docker-entrypoint-initdb.d/01_schema.sql

# Open browser
# Frontend:  http://localhost:3000
# API:       http://localhost:8000/api/docs
```

---

## Option B: Manual Setup

### 1. Database
```bash
psql -U postgres -c "CREATE DATABASE nrip_db;"
psql -U postgres -c "CREATE USER nrip_user WITH PASSWORD 'nrip_password';"
psql -U postgres -c "GRANT ALL ON DATABASE nrip_db TO nrip_user;"
psql -U nrip_user -d nrip_db -f database/migrations/001_initial_schema.sql
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env   # edit .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Celery Worker (optional)
```bash
celery -A automation.tasks.celery_app worker --loglevel=info
celery -A automation.tasks.celery_app beat --loglevel=info
```

---

## 🎯 Hackathon Demo Steps

```bash
# Run automated demo (works without backend)
python docs/demo_pipeline.py

# Or validate entire platform
python validate.py
```

## Demo User Accounts (pre-seeded)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@nrip.gov.in | Admin@1234 |
| Government | authority@nh.gov.in | Admin@1234 |
| Contractor | contractor@roads.com | Admin@1234 |
| Citizen | citizen@example.com | Admin@1234 |
| Auditor | auditor@nrip.gov.in | Admin@1234 |

## API Endpoints Quick Reference

```
POST /api/v1/auth/login        → Login
POST /api/v1/detect/image      → Upload + detect potholes
GET  /api/v1/potholes/         → List all potholes
GET  /api/v1/potholes/geojson  → GeoJSON for Leaflet map
POST /api/v1/complaints/       → File complaint
POST /api/v1/contractors/assign → Auto-assign contractor
POST /api/v1/repairs/verify    → AI repair verification
GET  /api/v1/dashboard/stats   → Dashboard statistics
GET  /api/v1/transparency/     → Public transparency data
GET  /api/v1/blockchain/       → Blockchain ledger
POST /api/v1/predict/road/{id} → Predict road failure
```
