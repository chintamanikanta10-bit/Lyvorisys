@echo off
echo Starting backend...
start cmd /k "python -m pip install -r backend/requirements.txt && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo Starting frontend...
start cmd /k "cd frontend && npm run dev"

echo Both servers are starting! Access the frontend at usually http://localhost:5173
pause
