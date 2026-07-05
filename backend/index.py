import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent

for path in (str(PROJECT_DIR), str(BACKEND_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from main import app
