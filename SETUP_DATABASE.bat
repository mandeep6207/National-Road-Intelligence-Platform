@echo off
TITLE NRIP — Database Setup
echo.
echo  =============================================================
echo   National Road Intelligence Platform — Database Setup
echo  =============================================================
echo.
echo  This script will:
echo   1. Create PostgreSQL user: nrip_user
echo   2. Create database: nrip_db
echo   3. Apply full schema (15 tables, enums, views)
echo   4. Seed demo user accounts
echo.
echo  Requires: PostgreSQL installed and running on port 5432
echo  Requires: psql in PATH (usually from PostgreSQL installation)
echo.

cd /d "%~dp0"

:: Check psql
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: psql not found.
    echo Install PostgreSQL from https://www.postgresql.org
    echo Add PostgreSQL\bin to PATH
    pause
    exit /b 1
)

echo psql found.
echo.
echo [1/3] Creating database and user...
psql -U postgres -c "CREATE USER nrip_user WITH PASSWORD 'nrip_password';" 2>nul
psql -U postgres -c "CREATE DATABASE nrip_db OWNER nrip_user;" 2>nul
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE nrip_db TO nrip_user;" 2>nul
psql -U postgres -d nrip_db -c "GRANT ALL ON SCHEMA public TO nrip_user;" 2>nul
echo    Done (errors about existing objects are normal)

echo.
echo [2/3] Applying schema...
psql -U nrip_user -d nrip_db -f "database\migrations\001_initial_schema.sql"
if %errorlevel% neq 0 (
    echo WARNING: Schema may have partial errors. Trying to continue...
)

echo.
echo [3/3] Seeding demo users (Admin@1234 passwords)...
cd backend
python -c "
import sys
sys.path.insert(0, '..')
import asyncio
import os
os.chdir('..')

# Add backend to path
sys.path.insert(0, 'backend')
from database.seed_demo import main
main()
" 2>nul

if %errorlevel% neq 0 (
    echo Note: Run 'python database/seed_demo.py' manually to seed users
)

echo.
echo  =============================================================
echo   Database setup complete!
echo.
echo   Demo login credentials (password: Admin@1234):
echo     admin@nrip.gov.in     - Super Admin
echo     authority@nh.gov.in   - Government
echo     contractor@roads.com  - Contractor
echo     citizen@example.com   - Citizen
echo     auditor@nrip.gov.in   - Auditor
echo.
echo   SQL fallback password (from schema.sql): secret
echo  =============================================================
echo.
pause
