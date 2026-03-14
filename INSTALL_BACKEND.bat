@echo off
TITLE NRIP — Install Backend Dependencies
echo.
echo  =============================================================
echo   National Road Intelligence Platform — Backend Setup
echo  =============================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Install from https://python.org
    pause
    exit /b 1
)

echo.
echo [2/3] Installing Python dependencies...
echo.
echo  Choose install mode:
echo   1. Minimal (recommended for demo — fast, no GPU/torch required)
echo   2. Full    (includes YOLOv8 + PyTorch — large download ~3GB)
echo.
set /p CHOICE="Enter 1 or 2 [default: 1]: "
if "%CHOICE%"=="2" (
    echo Installing full dependencies (this may take 10-20 minutes)...
    cd backend
    pip install -r requirements.txt
) else (
    echo Installing minimal dependencies (faster, ~2-3 minutes)...
    cd backend
    pip install -r requirements-minimal.txt
)
if %errorlevel% neq 0 (
    echo ERROR: pip install failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Creating upload directories...
mkdir ..\uploads\images ..\uploads\videos ..\uploads\repairs 2>nul

echo.
echo  ============================================================
echo   Backend dependencies installed successfully!
echo   Run START_BACKEND.bat to start the API server
echo  ============================================================
echo.
pause
