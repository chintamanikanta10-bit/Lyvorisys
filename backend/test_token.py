from datetime import datetime, timedelta
from jose import jwt

# JWT Configuration (same as in main.py)
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

try:
    print("Testing create_access_token...")
    token = create_access_token(data={"sub": "admin"})
    print("Token created:", token)
except Exception as e:
    print("Error creating token:", e)
    import traceback
    traceback.print_exc()
