#!/usr/bin/env python3
"""
National Road Intelligence Platform — Setup & Validation Script
Run this to verify all components are correctly configured.
"""

import os
import sys
import subprocess
import json
from pathlib import Path

ROOT = Path(__file__).parent

COLORS = {
    "green": "\033[92m",
    "red": "\033[91m",
    "yellow": "\033[93m",
    "blue": "\033[94m",
    "bold": "\033[1m",
    "reset": "\033[0m",
}


def ok(msg): print(f"  {COLORS['green']}✅ {msg}{COLORS['reset']}")
def err(msg): print(f"  {COLORS['red']}❌ {msg}{COLORS['reset']}")
def warn(msg): print(f"  {COLORS['yellow']}⚠️  {msg}{COLORS['reset']}")
def info(msg): print(f"  {COLORS['blue']}ℹ️  {msg}{COLORS['reset']}")
def header(msg): print(f"\n{COLORS['bold']}{COLORS['blue']}{'='*60}{COLORS['reset']}\n{COLORS['bold']} {msg}{COLORS['reset']}\n{'='*60}")


def check_directory_structure():
    header("Phase 1: Directory Structure")
    required_dirs = [
        "backend/app/core",
        "backend/app/models",
        "backend/app/schemas",
        "backend/app/api/v1/endpoints",
        "backend/app/services",
        "backend/tests",
        "frontend/app",
        "frontend/components/map",
        "ai/detection",
        "ai/prediction",
        "ai/models",
        "automation/tasks",
        "database/migrations",
        "blockchain",
        "docs",
    ]
    all_ok = True
    for d in required_dirs:
        path = ROOT / d
        if path.exists():
            ok(d)
        else:
            err(f"{d} — MISSING")
            all_ok = False
    return all_ok


def check_env_file():
    header("Phase 1: Environment Configuration")
    env_example = ROOT / ".env.example"
    env_file = ROOT / ".env"
    if env_example.exists():
        ok(".env.example found")
    else:
        err(".env.example MISSING")
    if env_file.exists():
        ok(".env found")
    else:
        warn(".env not found — copy .env.example to .env and configure")
    return True


def check_database_schema():
    header("Phase 2: Database Schema")
    schema = ROOT / "database/migrations/001_initial_schema.sql"
    if schema.exists():
        content = schema.read_text()
        tables = [
            "users", "roads", "potholes", "complaints",
            "contractors", "repairs", "citizen_votes",
            "risk_scores", "reputation_scores", "budget_records",
            "blockchain_records", "audit_logs"
        ]
        all_ok = True
        for table in tables:
            if f"CREATE TABLE {table}" in content or f"CREATE TABLE IF NOT EXISTS {table}" in content:
                ok(f"Table: {table}")
            else:
                err(f"Table MISSING: {table}")
                all_ok = False
        return all_ok
    else:
        err("schema.sql MISSING")
        return False


def check_backend_files():
    header("Phase 3: Backend API Files")
    required_files = [
        "backend/requirements.txt",
        "backend/app/main.py",
        "backend/app/core/config.py",
        "backend/app/core/database.py",
        "backend/app/core/security.py",
        "backend/app/models/__init__.py",
        "backend/app/schemas/__init__.py",
        "backend/app/api/v1/__init__.py",
        "backend/app/api/v1/endpoints/auth.py",
        "backend/app/api/v1/endpoints/detection.py",
        "backend/app/api/v1/endpoints/potholes.py",
        "backend/app/api/v1/endpoints/complaints.py",
        "backend/app/api/v1/endpoints/contractors.py",
        "backend/app/api/v1/endpoints/repairs.py",
        "backend/app/api/v1/endpoints/dashboard.py",
        "backend/app/api/v1/endpoints/transparency.py",
        "backend/app/api/v1/endpoints/blockchain.py",
        "backend/app/api/v1/endpoints/prediction.py",
        "backend/app/services/detection_service.py",
        "backend/app/services/blockchain_service.py",
        "backend/app/services/risk_service.py",
        "backend/app/services/complaint_service.py",
        "backend/app/services/verification_service.py",
        "backend/app/services/prediction_service.py",
    ]
    all_ok = True
    for f in required_files:
        path = ROOT / f
        if path.exists():
            ok(f)
        else:
            err(f"{f} — MISSING")
            all_ok = False
    return all_ok


def check_api_routes():
    header("Phase 3: API Route Registration")
    router_file = ROOT / "backend/app/api/v1/__init__.py"
    if not router_file.exists():
        err("API router not found")
        return False
    
    content = router_file.read_text()
    routes = [
        "auth", "detection", "potholes", "complaints",
        "contractors", "repairs", "dashboard", "transparency",
        "blockchain", "prediction"
    ]
    all_ok = True
    for route in routes:
        if route in content:
            ok(f"Route registered: /{route}")
        else:
            err(f"Route NOT registered: /{route}")
            all_ok = False
    return all_ok


def check_ai_modules():
    header("Phase 4: AI Detection Module")
    ai_files = [
        "ai/detection/detector.py",
        "ai/prediction/train_model.py",
        "backend/app/services/detection_service.py",
        "backend/app/services/prediction_service.py",
    ]
    all_ok = True
    for f in ai_files:
        path = ROOT / f
        if path.exists():
            ok(f)
        else:
            err(f"{f} — MISSING")
            all_ok = False
    
    # Check for YOLOv8 integration
    det_service = ROOT / "backend/app/services/detection_service.py"
    if det_service.exists():
        content = det_service.read_text()
        if "ultralytics" in content:
            ok("YOLOv8 (ultralytics) integration found")
        if "_simulate_detections" in content:
            ok("Simulation fallback present for demo mode")
    return all_ok


def check_automation():
    header("Phase 6: Automation Engine")
    files = [
        "automation/tasks/celery_app.py",
        "automation/tasks/detection_tasks.py",
        "automation/tasks/satellite_tasks.py",
        "automation/tasks/risk_tasks.py",
        "automation/tasks/repair_tasks.py",
        "automation/tasks/maintenance_tasks.py",
        "automation/tasks/reputation_tasks.py",
    ]
    all_ok = True
    for f in files:
        path = ROOT / f
        if path.exists():
            ok(f)
        else:
            err(f"{f} — MISSING")
            all_ok = False
    return all_ok


def check_blockchain():
    header("Phase 7: Blockchain Ledger")
    service = ROOT / "backend/app/services/blockchain_service.py"
    if service.exists():
        content = service.read_text()
        checks = [
            ("SHA256 hashing", "_compute_data_hash"),
            ("Transaction hash generation", "_generate_tx_hash"),
            ("Event logging", "log_event"),
        ]
        all_ok = True
        for label, symbol in checks:
            if symbol in content:
                ok(label)
            else:
                err(f"{label} — MISSING function: {symbol}")
                all_ok = False
        return all_ok
    else:
        err("blockchain_service.py MISSING")
        return False


def check_frontend():
    header("Phase 8: Frontend Pages")
    pages = [
        "frontend/app/page.tsx",
        "frontend/app/layout.tsx",
        "frontend/app/map/page.tsx",
        "frontend/app/transparency/page.tsx",
        "frontend/app/policy/page.tsx",
        "frontend/app/dashboard/government/page.tsx",
        "frontend/app/dashboard/citizen/page.tsx",
        "frontend/app/dashboard/contractor/page.tsx",
        "frontend/app/dashboard/auditor/page.tsx",
        "frontend/app/dashboard/admin/page.tsx",
        "frontend/components/map/LeafletMap.tsx",
    ]
    all_ok = True
    for f in pages:
        path = ROOT / f
        if path.exists():
            ok(f)
        else:
            err(f"{f} — MISSING")
            all_ok = False
    return all_ok


def check_frontend_dependencies():
    header("Phase 8: Frontend Dependencies")
    pkg = ROOT / "frontend/package.json"
    if not pkg.exists():
        err("package.json MISSING")
        return False
    
    data = json.loads(pkg.read_text())
    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
    
    required = ["next", "react", "leaflet", "recharts", "axios", "tailwindcss", "typescript"]
    all_ok = True
    for dep in required:
        if dep in deps:
            ok(f"{dep}: {deps[dep]}")
        else:
            err(f"{dep} — NOT in package.json")
            all_ok = False
    return all_ok


def check_map_component():
    header("Phase 9: Leaflet Map Component")
    map_file = ROOT / "frontend/components/map/LeafletMap.tsx"
    if not map_file.exists():
        err("LeafletMap.tsx MISSING")
        return False
    
    content = map_file.read_text()
    checks = [
        ("SSR disabled", "ssr: false"),
        ("Marker colors", "critical"),
        ("Popup/tooltip", "Popup"),
        ("API fetch", "potholes"),
    ]
    all_ok = True
    for label, keyword in checks:
        if keyword in content:
            ok(label)
        else:
            warn(f"{label} — keyword '{keyword}' not found")
    return all_ok


def check_docker():
    header("Deployment: Docker Configuration")
    files = {
        "docker-compose.yml": ["postgres", "redis", "backend", "frontend", "celery"],
        "backend/Dockerfile": ["FROM python", "uvicorn"],
        "frontend/Dockerfile": ["FROM node", "npm"],
    }
    all_ok = True
    for filename, keywords in files.items():
        path = ROOT / filename
        if path.exists():
            content = path.read_text()
            missing = [k for k in keywords if k not in content]
            if missing:
                warn(f"{filename} — missing: {missing}")
            else:
                ok(filename)
        else:
            err(f"{filename} — MISSING")
            all_ok = False
    return all_ok


def check_docs():
    header("Documentation & Demo")
    files = [
        "README.md",
        "docs/DEPLOYMENT.md",
        "docs/demo_pipeline.py",
    ]
    all_ok = True
    for f in files:
        path = ROOT / f
        if path.exists():
            ok(f)
        else:
            err(f"{f} — MISSING")
            all_ok = False
    return all_ok


def print_summary(results):
    header("VALIDATION SUMMARY")
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    failed = total - passed
    
    for name, status in results.items():
        if status:
            print(f"  {COLORS['green']}✅ PASS{COLORS['reset']} — {name}")
        else:
            print(f"  {COLORS['red']}❌ FAIL{COLORS['reset']} — {name}")
    
    print(f"\n{'='*60}")
    score_pct = int(passed / total * 100)
    if failed == 0:
        print(f"{COLORS['green']}{COLORS['bold']}  🎉 ALL CHECKS PASSED! ({passed}/{total}) — 100%{COLORS['reset']}")
    else:
        print(f"{COLORS['yellow']}{COLORS['bold']}  ⚠️  {passed}/{total} checks passed ({score_pct}%) — {failed} need attention{COLORS['reset']}")
    print(f"{'='*60}\n")


def print_run_instructions():
    header("Quick Start Instructions")
    print("""
  📋 SETUP STEPS:

  1️⃣  Copy environment file:
     cp .env.example .env
     # Edit .env with your database credentials

  2️⃣  Start services with Docker:
     docker-compose up -d postgres redis

  3️⃣  Apply database schema:
     psql -U nrip_user -d nrip_db -f database/migrations/001_initial_schema.sql

  4️⃣  Install backend dependencies:
     cd backend
     pip install -r requirements.txt

  5️⃣  Start FastAPI backend:
     cd backend
     uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  6️⃣  Install frontend dependencies:
     cd frontend
     npm install

  7️⃣  Start frontend:
     cd frontend
     npm run dev

  8️⃣  Start Celery worker (optional):
     celery -A automation.tasks.celery_app worker --loglevel=info

  🎯 Demo:
     python docs/demo_pipeline.py

  📍 URLs:
     Frontend:  http://localhost:3000
     API:       http://localhost:8000
     API Docs:  http://localhost:8000/api/docs
    """)


def main():
    print(f"\n{COLORS['bold']}{COLORS['blue']}")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║     NATIONAL ROAD INTELLIGENCE PLATFORM — VALIDATOR     ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(COLORS['reset'])

    results = {
        "Directory Structure": check_directory_structure(),
        "Environment Config": check_env_file(),
        "Database Schema": check_database_schema(),
        "Backend API Files": check_backend_files(),
        "API Route Registration": check_api_routes(),
        "AI Detection Module": check_ai_modules(),
        "Automation Engine": check_automation(),
        "Blockchain Ledger": check_blockchain(),
        "Frontend Pages": check_frontend(),
        "Frontend Dependencies": check_frontend_dependencies(),
        "Leaflet Map": check_map_component(),
        "Docker Config": check_docker(),
        "Documentation": check_docs(),
    }

    print_summary(results)
    print_run_instructions()


if __name__ == "__main__":
    main()
