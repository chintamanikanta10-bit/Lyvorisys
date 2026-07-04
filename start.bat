@echo off
echo Starting LYVORISYS...

echo Stopping existing servers...
powershell -ExecutionPolicy Bypass -File "%~dp0stop_servers.ps1"

echo Starting Backend (port 8001)...
start "Backend Server" cmd /k "cd /d %~dp0backend && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001"

timeout /t 2 /nobreak >nul

echo Starting Frontend (port 5174)...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Done!
echo - Backend: http://localhost:8001
echo - Frontend: http://localhost:5174
pause
