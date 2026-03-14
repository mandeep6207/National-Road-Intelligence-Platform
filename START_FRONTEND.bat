@echo off
TITLE NRIP — Next.js Frontend (Port 3000)
echo.
echo  =============================================================
echo   National Road Intelligence Platform
echo   Starting Next.js Frontend on http://localhost:3000
echo  =============================================================
echo.
echo   Homepage:    http://localhost:3000
echo   Live Map:    http://localhost:3000/map
echo   Gov Dash:    http://localhost:3000/dashboard/government
echo   Citizen:     http://localhost:3000/dashboard/citizen
echo   Contractor:  http://localhost:3000/dashboard/contractor
echo   Auditor:     http://localhost:3000/dashboard/auditor
echo   Admin:       http://localhost:3000/dashboard/admin
echo   Transparency:http://localhost:3000/transparency
echo   Policy:      http://localhost:3000/policy
echo.
echo   Press Ctrl+C to stop the server
echo  =============================================================
echo.

cd /d "%~dp0frontend"

set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start frontend server.
    echo Make sure you ran INSTALL_FRONTEND.bat first.
    pause
)
