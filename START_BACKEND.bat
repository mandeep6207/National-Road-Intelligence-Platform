@echo off
TITLE NRIP — FastAPI Backend (Port 8000)
echo.
echo  =============================================================
echo   National Road Intelligence Platform
echo   Starting FastAPI Backend on http://localhost:8000
echo  =============================================================
echo.
echo   API Docs:    http://localhost:8000/api/docs
echo   API Base:    http://localhost:8000/api/v1
echo   Health:      http://localhost:8000/health
echo.
echo   Press Ctrl+C to stop the server
echo  =============================================================
echo.

cd /d "%~dp0backend"

:: Set PYTHONPATH so app.* imports work
set PYTHONPATH=%~dp0

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start backend server.
    echo Make sure you ran INSTALL_BACKEND.bat first.
    echo Make sure PostgreSQL is running.
    pause
)
