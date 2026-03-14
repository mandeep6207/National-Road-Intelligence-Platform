# 🚀 Deployment Guide — National Road Intelligence Platform

## Local Development Setup

### Prerequisites
```
Python 3.11+
Node.js 18+
PostgreSQL 15+
Redis 7+
Git
```

### 1. Clone & Configure
```bash
git clone https://github.com/your-org/nrip
cd nrip
cp .env.example .env
# Edit .env with your database credentials
```

### 2. Database Setup
```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE nrip_db;"
psql -U postgres -c "CREATE USER nrip_user WITH PASSWORD 'nrip_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE nrip_db TO nrip_user;"

# Run migrations
psql -U nrip_user -d nrip_db -f database/migrations/001_initial_schema.sql
```

### 3. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### 5. Redis & Celery Workers
```bash
# Start Redis (Windows: use WSL or Redis for Windows)
redis-server

# Start Celery worker
cd automation
celery -A tasks.celery_app worker --loglevel=info

# Start Celery Beat (scheduler)
celery -A tasks.celery_app beat --loglevel=info
```

### 6. Train AI Model (Optional)
```bash
cd ai/prediction
python train_model.py
```

### 7. Run Demo
```bash
python docs/demo_pipeline.py
```

---

## Docker Deployment

### docker-compose.yml (included)
```bash
docker-compose up --build
```

Services:
- `nrip-backend`: FastAPI on port 8000
- `nrip-frontend`: Next.js on port 3000
- `nrip-postgres`: PostgreSQL on port 5432
- `nrip-redis`: Redis on port 6379
- `nrip-celery`: Celery workers
- `nrip-ai`: AI detection service

---

## Production Deployment (AWS/GCP/Azure)

### Recommended Architecture
```
Load Balancer (ALB/Nginx)
├── Frontend (Vercel / ECS)
├── Backend API (ECS / Cloud Run)
│   ├── FastAPI x4 instances
│   └── AI Service x2 instances
├── Database (RDS PostgreSQL Multi-AZ)
├── Cache (ElastiCache Redis)
├── Storage (S3 for uploads)
└── CDN (CloudFront)
```

### Environment Variables (Production)
```env
APP_ENV=production
APP_DEBUG=false
DATABASE_URL=postgresql+asyncpg://user:pass@rds-endpoint:5432/nrip_prod
REDIS_URL=redis://elasticache-endpoint:6379/0
JWT_SECRET_KEY=<256-bit-random-key>
BLOCKCHAIN_MODE=polygon
POLYGON_RPC_URL=https://polygon-rpc.com
```

---

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

### Key Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/detect/image | Upload image, detect potholes |
| POST | /api/v1/detect/video | Upload video, detect potholes |
| GET | /api/v1/potholes/map-data | GeoJSON for map |
| POST | /api/v1/complaints/ | File complaint |
| GET | /api/v1/dashboard/stats | KPI statistics |
| GET | /api/v1/transparency/ | Public data |
| GET | /api/v1/blockchain/ | Ledger records |
| POST | /api/v1/repairs/{id}/verify | AI verify repair |
| GET | /api/v1/predict/road/{id} | Failure prediction |

---

## Hackathon Demo Instructions

1. **Start all services** (see Local Setup above)
2. **Open browser** → http://localhost:3000
3. **Run auto demo**: `python docs/demo_pipeline.py`
4. **Show live map**: Navigate to /map
5. **Upload test image**: Go to Citizen Portal → AI Detect
6. **Show Government Dashboard**: /dashboard/government
7. **Show Blockchain Ledger**: /transparency → Blockchain
8. **Show Policy Intelligence**: /policy → Failure Forecast

Demo credentials:
- Government: gov@nrip.gov.in / Demo@1234
- Citizen: citizen@test.com / Demo@1234
- Contractor: contractor@test.com / Demo@1234
