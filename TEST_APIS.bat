@echo off
TITLE NRIP — API Connectivity Test
echo.
echo  =============================================================
echo   National Road Intelligence Platform — API Connectivity Test
echo  =============================================================
echo.

cd /d "%~dp0"

echo Testing API endpoints...
echo.

:: Test root
echo [1] GET http://localhost:8000/
curl -s -o nul -w "  Status: %%{http_code}  Time: %%{time_total}s\n" http://localhost:8000/
echo     -> Should be 200

echo.
echo [2] GET http://localhost:8000/health
curl -s http://localhost:8000/health
echo.
echo     -> Should return {"status":"healthy",...}

echo.
echo [3] GET http://localhost:8000/api/openapi.json (API schema)
curl -s -o nul -w "  Status: %%{http_code}\n" http://localhost:8000/api/openapi.json
echo     -> Should be 200

echo.
echo [4] GET http://localhost:8000/api/v1/potholes/ (list potholes)
curl -s -o nul -w "  Status: %%{http_code}\n" http://localhost:8000/api/v1/potholes/
echo     -> Should be 200

echo.
echo [5] GET http://localhost:8000/api/v1/transparency/
curl -s -o nul -w "  Status: %%{http_code}\n" http://localhost:8000/api/v1/transparency/
echo     -> Should be 200

echo.
echo [6] GET http://localhost:8000/api/v1/blockchain/
curl -s -o nul -w "  Status: %%{http_code}\n" http://localhost:8000/api/v1/blockchain/
echo     -> Should be 200

echo.
echo [7] GET http://localhost:8000/api/v1/dashboard/stats
curl -s -o nul -w "  Status: %%{http_code}\n" http://localhost:8000/api/v1/dashboard/stats
echo     -> Should be 200

echo.
echo [8] GET http://localhost:8000/api/v1/potholes/map-data
curl -s -o nul -w "  Status: %%{http_code}\n" http://localhost:8000/api/v1/potholes/map-data
echo     -> Should be 200 (GeoJSON)

echo.
echo [9] POST http://localhost:8000/api/v1/auth/login (invalid - expect 401)
curl -s -o nul -w "  Status: %%{http_code}\n" -X POST http://localhost:8000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@nrip.gov.in\",\"password\":\"Admin@1234\"}"
echo     -> Should be 200 (if DB seeded) or 401

echo.
echo [10] Frontend: http://localhost:3000
curl -s -o nul -w "  Status: %%{http_code}\n" http://localhost:3000
echo     -> Should be 200

echo.
echo  =============================================================
echo   Connectivity test complete!
echo   Open http://localhost:8000/api/docs for full API explorer
echo  =============================================================
echo.
pause
