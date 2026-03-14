@echo off
TITLE NRIP — Install Frontend Dependencies
echo.
echo  =============================================================
echo   National Road Intelligence Platform — Frontend Setup
echo  =============================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo [2/2] Installing npm packages...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo   Frontend dependencies installed successfully!
echo   Run START_FRONTEND.bat to start the web server
echo  ============================================================
echo.
pause
