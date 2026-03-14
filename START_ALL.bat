@echo off
TITLE NRIP — Full Platform Startup
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║     NATIONAL ROAD INTELLIGENCE PLATFORM — FULL STARTUP     ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  This will start ALL platform services:
echo   - FastAPI Backend    (http://localhost:8000)
echo   - Next.js Frontend   (http://localhost:3000)
echo.
echo  Prerequisites required:
echo   [x] PostgreSQL running on port 5432
echo   [x] Database 'nrip_db' created with schema applied
echo   [x] Python deps installed (run INSTALL_BACKEND.bat)
echo   [x] Node.js deps installed (run INSTALL_FRONTEND.bat)
echo.
echo  Press any key to start, or Ctrl+C to cancel...
pause >nul

:: Start backend in new window
echo.
echo [1/2] Starting FastAPI backend...
start "NRIP Backend - Port 8000" cmd /k "cd /d "%~dp0backend" && set PYTHONPATH=%~dp0 && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend in new window
echo [2/2] Starting Next.js frontend...
start "NRIP Frontend - Port 3000" cmd /k "cd /d "%~dp0frontend" && set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 && npm run dev"

:: Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo  ============================================================
echo   Platform started! Opening in browser...
echo.
echo   Frontend:   http://localhost:3000
echo   API Docs:   http://localhost:8000/api/docs
echo  ============================================================
echo.

:: Open browser
start "" "http://localhost:3000"
start "" "http://localhost:8000/api/docs"

echo  Both servers are running in separate windows.
echo  Close those windows to stop the servers.
echo.
pause
