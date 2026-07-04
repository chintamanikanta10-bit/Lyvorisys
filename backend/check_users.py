from sqlalchemy.orm import Session
from backend.database.database import engine, get_db
from backend.models.models import User
from backend.main import verify_password

def check_users():
    db = next(get_db())
    
    print("Users in database:")
    users = db.query(User).all()
    
    if not users:
        print("No users found!")
    else:
        for user in users:
            print(f"ID: {user.id}")
            print(f"Username: {user.username}")
            print(f"Email: {user.email}")
            print(f"Role: {user.role}")
            print(f"Employee ID: {user.employee_id}")
            print(f"Hashed Password: {user.hashed_password}")
            
            # Verify the password
            try:
                is_valid = verify_password("admin123", user.hashed_password)
                print(f"Password 'admin123' is valid: {is_valid}")
            except Exception as e:
                print(f"Error verifying password: {e}")
            print("-" * 50)
    
    db.close()

if __name__ == "__main__":
    check_users()
