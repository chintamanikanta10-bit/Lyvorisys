@echo off
echo Stopping any running servers on ports 8001 and 5174...

:: Stop backend on port 8001
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8001" ^| find "LISTENING"') do (
    echo Killing backend process (PID: %%a)...
    taskkill /F /PID %%a
)

:: Stop frontend on port 5174
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5174" ^| find "LISTENING"') do (
    echo Killing frontend process (PID: %%a)...
    taskkill /F /PID %%a
)

echo Done stopping servers!
timeout /t 1 /nobreak >nul
