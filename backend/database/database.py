import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Use SQLite by default for local testing. On Vercel, Neon may be connected
# with a custom prefix, so prefer NEON_URL when DATABASE_URL is still local.
database_url = os.getenv("DATABASE_URL")
neon_url = os.getenv("NEON_URL")

if neon_url and (not database_url or database_url.startswith("sqlite")):
    SQLALCHEMY_DATABASE_URL = neon_url
else:
    SQLALCHEMY_DATABASE_URL = database_url or "sqlite:///./attendance.db"

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
