# 🇮🇳 National Road Intelligence Platform

> **Powered by AI | Secured by Blockchain | Governed by Data**

A production-grade full-stack platform for automated pothole detection, road damage management, repair lifecycle tracking, and government policy intelligence.

---

## 🏛️ Platform Overview

The National Road Intelligence Platform (NRIP) implements a complete 19-stage infrastructure management pipeline:

```
Road Sensors → AI Detection → Risk Engine → Priority Engine →
Auto Complaint → Repair Execution → AI Verification →
Blockchain Ledger → Public Portal → Contractor Accountability →
Reputation System → Budget Guard → Citizen Verification →
Digital Twin → Predictive AI → Failure Prediction →
Policy Dashboard → Global Benchmark Engine
```

---

## 🗂️ Project Structure

```
nrip/
├── frontend/          # Next.js + TailwindCSS + Leaflet
├── backend/           # FastAPI (Python)
├── ai/                # YOLOv8 + PyTorch detection & prediction
├── automation/        # Celery + Redis task workers
├── database/          # PostgreSQL schemas & migrations
├── blockchain/        # Polygon/simulated ledger
└── docs/              # API docs & deployment guides
```

---

## 👥 User Roles

| Role | Access |
|------|--------|
| Super Admin | Full system control |
| Government Authority | Policy dashboard, budget oversight |
| Contractor | Work orders, repair uploads |
| Citizen | Complaints, voting, transparency |
| Auditor | Audit trails, blockchain verification |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 1. Clone & Setup
```bash
git clone https://github.com/your-org/nrip
cd nrip
cp .env.example .env
# Edit .env with your credentials
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. AI Module
```bash
cd ai
pip install -r requirements.txt
python detection/detector.py
```

### 5. Automation Workers
```bash
cd automation
celery -A tasks.celery_app worker --loglevel=info
```

---

## 🎯 Demo Flow

1. Upload dashcam video → AI detects pothole
2. Map marker appears (Red = Critical)
3. Auto-complaint generated
4. Contractor assigned via priority engine
5. Contractor uploads repair evidence
6. AI verifies repair quality
7. Blockchain record created
8. Citizen portal updated
9. Policy dashboard reflects data

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TailwindCSS, Leaflet, Chart.js |
| Backend | FastAPI, Python 3.11, SQLAlchemy, Alembic |
| AI | YOLOv8, OpenCV, PyTorch |
| Automation | Celery, Redis, APScheduler |
| Database | PostgreSQL 15 |
| Blockchain | Polygon Testnet (simulated ledger) |
| Maps | OpenStreetMap, Sentinel-2 |

---

## 🇮🇳 Government of India | Digital India Initiative
