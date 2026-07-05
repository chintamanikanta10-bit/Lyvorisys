from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.orm import Session
try:
    from backend.database.database import engine, Base, get_db
    from backend.models.models import User, Employee, Holiday, SalaryRecord, Attendance, LeaveBalance, UploadedFileDB, SalaryObjection
    from backend.services.excel_processor import process_attendance_excel
    from backend.services.salary_service import calculate_monthly_salary
    from backend.services.email_service import send_salary_slip_email
    from backend.services.background_task_service import start_background_scheduler, stop_background_scheduler
except ModuleNotFoundError:
    from database.database import engine, Base, get_db
    from models.models import User, Employee, Holiday, SalaryRecord, Attendance, LeaveBalance, UploadedFileDB, SalaryObjection
    from services.excel_processor import process_attendance_excel
    from services.salary_service import calculate_monthly_salary
    from services.email_service import send_salary_slip_email
    from services.background_task_service import start_background_scheduler, stop_background_scheduler
import shutil
import os
import holidays
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt

# JWT Configuration
SECRET_KEY = "your-secret-key-change-this-in-production"  # Replace with a secure key in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing functions using bcrypt directly
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models for auth
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "hr"  # "hr" or "employee"
    employee_id: int | None = None  # Only for employee users

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    employee_id: int | None = None

# Helper functions

def get_user(db, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db, email: str):
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user

# Endpoint to add columns to users table
def ensure_user_columns():
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            existing = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
        else:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"))
            existing = {row[0] for row in result}
        
        new_columns = [
            ("email", "VARCHAR"),
            ("role", "VARCHAR DEFAULT 'hr'"),
            ("employee_id", "INTEGER")
        ]
        
        for name, definition in new_columns:
            if name not in existing:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))

Base.metadata.create_all(bind=engine)

ensure_user_columns()

def ensure_leave_balance_columns():
    new_columns = [
        ("monthly_comp_off_earned", "FLOAT DEFAULT 0.0"),
        ("carry_forward_comp_off", "FLOAT DEFAULT 0.0"),
        ("total_available_comp_off", "FLOAT DEFAULT 0.0"),
        ("used_comp_off", "FLOAT DEFAULT 0.0"),
        ("remaining_comp_off", "FLOAT DEFAULT 0.0")
    ]
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            existing = {row[1] for row in conn.execute(text("PRAGMA table_info(leave_balance)"))}
        else:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'leave_balance'"))
            existing = {row[0] for row in result}

        for name, definition in new_columns:
            if name not in existing:
                conn.execute(text(f"ALTER TABLE leave_balance ADD COLUMN {name} {definition}"))

ensure_leave_balance_columns()

def ensure_email_column():
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            existing = {row[1] for row in conn.execute(text("PRAGMA table_info(employees)"))}
        else:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'"))
            existing = {row[0] for row in result}
        
        if "email" not in existing:
            conn.execute(text("ALTER TABLE employees ADD COLUMN email VARCHAR"))

ensure_email_column()

def ensure_objection_columns():
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            existing = {row[1] for row in conn.execute(text("PRAGMA table_info(salary_objections)"))}
        else:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'salary_objections'"))
            existing = {row[0] for row in result}
        
        if "message_id" not in existing:
            conn.execute(text("ALTER TABLE salary_objections ADD COLUMN message_id VARCHAR"))

ensure_objection_columns()


def create_default_admin():
    db = next(get_db())
    try:
        if db.query(User).first():
            return
        admin = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            role="hr",
            employee_id=None
        )
        db.add(admin)
        db.commit()
        print("Default admin created.")
    except Exception as e:
        print(f"Admin creation failed: {e}")
    finally:
        db.close()


app = FastAPI(title="Smart Employee Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on app startup"""
    create_default_admin()
    try:
        start_background_scheduler()
    except Exception as e:
        print(f"Error starting background scheduler: {str(e)}")

@app.on_event("shutdown")
def shutdown_event():
    """Cleanup background tasks on app shutdown"""
    stop_background_scheduler()

class EmployeeCreate(BaseModel):
    employee_id: str
    employee_name: str
    department: str
    salary: float
    email: str | None = None

@app.post("/api/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if username or email already exists
    if get_user(db, username=user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    if get_user_by_email(db, email=user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    # Check role validity
    if user.role not in ["hr", "employee"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'hr' or 'employee'")
    # Check employee_id for employee role
    if user.role == "employee":
        if not user.employee_id:
            raise HTTPException(status_code=400, detail="Employee ID is required for employee role")
        # Check if employee exists
        emp = db.query(Employee).filter(Employee.id == user.employee_id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role,
        employee_id=user.employee_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info"""
    return current_user

@app.get("/")
def read_root():
    return {"message": "Attendance System API"}

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

@app.post("/api/upload_attendance/")
def upload_attendance(files: list[UploadFile] = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Only HR can upload attendance
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    total_records = 0
    import re
    # To detect month from filename: e.g., "january_attendance.xlsx", "april_2026.xlsx"
    months_map = {"january":1, "february":2, "march":3, "april":4, "may":5, "june":6, "july":7, "august":8, "september":9, "october":10, "november":11, "december":12}
    
    for file in files:
        if not file.filename.endswith(('.xls', '.xlsx')):
            continue
        
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            records_saved, parsed_month, parsed_year = process_attendance_excel(file_path, db)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
            
        total_records += records_saved
        
        # Determine month and year
        fname = file.filename.lower()
        file_month = parsed_month
        file_year = parsed_year
        
        # Fallback to filename
        for m_name, m_num in months_map.items():
            if m_name in fname:
                file_month = m_num
                break
                
        # Look for 4 digit year in filename
        year_match = re.search(r'\b(20\d{2})\b', fname)
        if year_match:
            file_year = int(year_match.group(1))
            
        if not file_month: file_month = datetime.now().month
        if not file_year: file_year = datetime.now().year
        
        # Save to DB
        existing_file = db.query(UploadedFileDB).filter(UploadedFileDB.file_name == file.filename).first()
        if existing_file:
            db.delete(existing_file)
            db.commit()
            
        new_file = UploadedFileDB(
            file_name=file.filename,
            month=file_month,
            year=file_year,
            upload_date=datetime.now().date(),
            total_employees=db.query(Attendance.employee_id).filter(Attendance.source_file == file.filename).distinct().count()
        )
        db.add(new_file)
        db.commit()
        
    return {"message": f"Successfully processed {total_records} attendance records."}

@app.get("/api/attendance/")
def get_attendance(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    results = []
    if current_user.role == "hr":
        # HR can see all attendance
        attendances = db.query(Attendance).order_by(Attendance.attendance_date.desc()).limit(100).all()
        for a in attendances:
            emp = db.query(Employee).filter(Employee.id == a.employee_id).first()
            results.append({
                "employee_id": emp.employee_id if emp else "Unknown",
                "employee_name": emp.employee_name if emp else "Unknown",
                "date": a.attendance_date,
                "in_time": a.in_time.strftime("%H:%M:%S") if a.in_time else "NULL",
                "out_time": a.out_time.strftime("%H:%M:%S") if a.out_time else "NULL",
                "status": a.status or "",
                "attendance_status": a.status or "",
            })
    elif current_user.role == "employee":
        # Employee can only see their own attendance
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="Employee not linked to user")
        attendances = db.query(Attendance).filter(Attendance.employee_id == current_user.employee_id).order_by(Attendance.attendance_date.desc()).all()
        emp = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
        for a in attendances:
            results.append({
                "employee_id": emp.employee_id if emp else "Unknown",
                "employee_name": emp.employee_name if emp else "Unknown",
                "date": a.attendance_date,
                "in_time": a.in_time.strftime("%H:%M:%S") if a.in_time else "NULL",
                "out_time": a.out_time.strftime("%H:%M:%S") if a.out_time else "NULL",
                "status": a.status or "",
                "attendance_status": a.status or "",
            })
    return results

@app.get("/api/dashboard_stats/")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    total_employees = db.query(Employee).count()
    total_holidays = db.query(Holiday).count()
    total_departments = (
        db.query(Employee.department)
        .distinct()
        .count()
    )
    return {
        "total_employees": total_employees,
        "total_holidays": total_holidays,
        "total_departments": total_departments
    }

@app.post("/api/calculate_salary/")
def calc_salary(month: int, year: int, db: Session = Depends(get_db), send_email: bool = False, current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    results = calculate_monthly_salary(db, month, year)
    
    if send_email:
        for res in results:
            emp = db.query(Employee).filter(Employee.employee_id == res["employee_id"]).first()
            if emp:
                attendance_summary = f"Present: {res['present_days']} days, Leave: {res['leave_days']} days, LOP: {res['lop_days']} days"
                send_salary_slip_email(
                    employee_name=emp.employee_name,
                    employee_email=emp.email,
                    month=month,
                    year=year,
                    attendance_summary=attendance_summary,
                    basic_salary=emp.salary,
                    deductions=res["deduction"],
                    net_salary=res["final_salary"]
                )
    
    return results

@app.get("/api/uploaded_files/")
def get_uploaded_files(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    files = db.query(UploadedFileDB).order_by(UploadedFileDB.upload_date.desc(), UploadedFileDB.id.desc()).all()
    results = []
    for f in files:
        results.append({
            "id": f.id,
            "filename": f.file_name,
            "month": f.month,
            "year": f.year,
            "upload_date": f.upload_date.isoformat() if f.upload_date else None,
            "total_employees": f.total_employees
        })
    print(f"Uploaded Files: {results}")
    return results

@app.delete("/api/uploaded_files/{file_id}")
def delete_uploaded_file(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    file_record = db.query(UploadedFileDB).filter(UploadedFileDB.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
        
    filename = file_record.file_name
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # 1. Remove attendance records
    db.query(Attendance).filter(Attendance.source_file == filename).delete(synchronize_session=False)
    
    # 2. To completely remove leave balance and salary, we might delete everything related to this month/year.
    # Note: If multiple files are uploaded for the same month, this deletes all salaries for the month.
    # The requirement: "remove corresponding attendance records, remove related leave balance records, remove related salary records"
    db.query(LeaveBalance).filter(LeaveBalance.month == file_record.month, LeaveBalance.year == file_record.year).delete(synchronize_session=False)
    db.query(SalaryRecord).filter(SalaryRecord.month == file_record.month, SalaryRecord.year == file_record.year).delete(synchronize_session=False)
    
    # 3. Remove DB record
    db.delete(file_record)
    db.commit()
    
    # 4. Remove physical file
    if os.path.exists(file_path):
        os.remove(file_path)
        
    return {"message": "File and related records deleted successfully."}

@app.get("/api/download_file/{file_id}")
def download_uploaded_file(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    file_record = db.query(UploadedFileDB).filter(UploadedFileDB.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
        
    filename = file_record.file_name
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file missing")
        
    return FileResponse(path=file_path, filename=filename)

@app.post("/api/calculate_salary_file/")
def calc_salary_by_file(filename: str, db: Session = Depends(get_db), send_email: bool = False, current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    file_record = db.query(UploadedFileDB).filter(UploadedFileDB.file_name == filename).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File metadata not found.")
        
    # Validation step 8
    if not file_record.month or not file_record.year:
        raise HTTPException(status_code=400, detail="Uploaded file metadata invalid.")
        
    # Debug Logs step 7
    print({"id": file_record.id, "filename": file_record.file_name, "month": file_record.month, "year": file_record.year})
    
    month = file_record.month
    year = file_record.year
    
    results = calculate_monthly_salary(db, month, year)
    
    if send_email:
        for res in results:
            emp = db.query(Employee).filter(Employee.employee_id == res["employee_id"]).first()
            if emp:
                attendance_summary = f"Present: {res['present_days']} days, Leave: {res['leave_days']} days, LOP: {res['lop_days']} days"
                send_salary_slip_email(
                    employee_name=emp.employee_name,
                    employee_email=emp.email,
                    month=month,
                    year=year,
                    attendance_summary=attendance_summary,
                    basic_salary=emp.salary,
                    deductions=res["deduction"],
                    net_salary=res["final_salary"]
                )
    
    return {"month": month, "year": year, "results": results}

@app.get("/api/leave_balances/")
def get_leave_balances(month: int, year: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    results = []
    if current_user.role == "hr":
        # HR sees all leave balances
        balances = db.query(LeaveBalance).filter(LeaveBalance.month == month, LeaveBalance.year == year).all()
        for lb in balances:
            emp = db.query(Employee).filter(Employee.id == lb.employee_id).first()
            if not emp:
                continue
            results.append({
                "employee_id": emp.employee_id,
                "employee_name": emp.employee_name,
                "previous_cl": lb.carry_forward_cl,
                "current_cl": lb.monthly_cl,
                "total_available_cl": lb.total_available_cl,
                "used_cl": lb.used_cl,
                "remaining_cl": lb.remaining_cl,
                "previous_comp_off": lb.carry_forward_comp_off,
                "monthly_comp_off_earned": lb.monthly_comp_off_earned,
                "total_available_comp_off": lb.total_available_comp_off,
                "used_comp_off": lb.used_comp_off,
                "remaining_comp_off": lb.remaining_comp_off,
                "lop_days": lb.lop_days
            })
    elif current_user.role == "employee":
        # Employee sees only their own leave balance
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="Employee not linked to user")
        balances = db.query(LeaveBalance).filter(LeaveBalance.month == month, LeaveBalance.year == year, LeaveBalance.employee_id == current_user.employee_id).all()
        for lb in balances:
            emp = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
            if not emp:
                continue
            results.append({
                "employee_id": emp.employee_id,
                "employee_name": emp.employee_name,
                "previous_cl": lb.carry_forward_cl,
                "current_cl": lb.monthly_cl,
                "total_available_cl": lb.total_available_cl,
                "used_cl": lb.used_cl,
                "remaining_cl": lb.remaining_cl,
                "previous_comp_off": lb.carry_forward_comp_off,
                "monthly_comp_off_earned": lb.monthly_comp_off_earned,
                "total_available_comp_off": lb.total_available_comp_off,
                "used_comp_off": lb.used_comp_off,
                "remaining_comp_off": lb.remaining_comp_off,
                "lop_days": lb.lop_days
            })
    return results

@app.get("/api/employees/")
def get_employees(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role == "hr":
        # HR sees all employees
        return db.query(Employee).all()
    elif current_user.role == "employee":
        # Employee sees only their own profile
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="Employee not linked to user")
        emp = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        return [emp]

@app.post("/api/employees/")
def add_employee(emp: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    existing = db.query(Employee).filter(Employee.employee_id == emp.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    new_emp = Employee(
        employee_id=emp.employee_id,
        employee_name=emp.employee_name,
        department=emp.department,
        salary=emp.salary,
        joining_date=datetime.now().date(),
        email=emp.email
    )
    db.add(new_emp)
    db.commit()
    return {"message": "Employee added successfully"}

class EmployeeUpdate(BaseModel):
    employee_id: str | None = None
    employee_name: str | None = None
    department: str | None = None
    salary: float | None = None
    email: str | None = None

@app.put("/api/employees/{emp_id}")
def update_employee(emp_id: str, emp_update: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    emp = db.query(Employee).filter(Employee.employee_id == emp_id).first()
    if not emp:
        try:
            emp_by_id = db.query(Employee).filter(Employee.id == int(emp_id)).first()
            if emp_by_id:
                emp = emp_by_id
        except ValueError:
            pass
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = emp_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(emp, key, value)
    
    db.commit()
    return {"message": "Employee updated successfully"}

@app.delete("/api/employees/{emp_id}")
def delete_employee(emp_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    emp = db.query(Employee).filter(Employee.employee_id == emp_id).first()
    if not emp:
        # Also try by DB ID if passed
        try:
            emp_by_id = db.query(Employee).filter(Employee.id == int(emp_id)).first()
            if emp_by_id:
                emp = emp_by_id
        except ValueError:
            pass
            
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Delete related attendance and salary records
    db.query(Attendance).filter(Attendance.employee_id == emp.id).delete(synchronize_session=False)
    db.query(SalaryRecord).filter(SalaryRecord.employee_id == emp.id).delete(synchronize_session=False)
    # Also delete leave balance if exists
    db.query(LeaveBalance).filter(LeaveBalance.employee_id == emp.id).delete(synchronize_session=False)

    db.delete(emp)
    db.commit()
    return {"message": "Employee removed successfully."}

@app.get("/api/salary_records/")
def get_salary_records(month: int = None, year: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get salary records - HR sees all, employee sees their own"""
    query = db.query(SalaryRecord)
    if month:
        query = query.filter(SalaryRecord.month == month)
    if year:
        query = query.filter(SalaryRecord.year == year)
    if current_user.role == "hr":
        # HR can see all
        records = query.order_by(SalaryRecord.year.desc(), SalaryRecord.month.desc()).all()
    elif current_user.role == "employee":
        # Employee only sees their own
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="Employee not linked to user")
        records = query.filter(SalaryRecord.employee_id == current_user.employee_id).order_by(SalaryRecord.year.desc(), SalaryRecord.month.desc()).all()
    results = []
    for rec in records:
        emp = db.query(Employee).filter(Employee.id == rec.employee_id).first()
        results.append({
            "id": rec.id,
            "employee_id": emp.employee_id if emp else "Unknown",
            "employee_name": emp.employee_name if emp else "Unknown",
            "month": rec.month,
            "year": rec.year,
            "working_days": rec.working_days,
            "present_days": rec.present_days,
            "leave_days": rec.leave_days,
            "lop_days": rec.lop_days,
            "salary_deduction": rec.salary_deduction,
            "final_salary": rec.final_salary
        })
    return results

@app.get("/api/holidays/")
def get_holidays(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Both HR and Employee can see holidays
    return db.query(Holiday).order_by(Holiday.holiday_date).all()

@app.post("/api/fetch_holidays/")
def fetch_local_holidays(year: int, country: str = "IN", db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    try:
        in_holidays = holidays.country_holidays(country, years=[year])
        count = 0
        for dt, name in in_holidays.items():
            existing = db.query(Holiday).filter(Holiday.holiday_date == dt).first()
            if not existing:
                h = Holiday(holiday_date=dt, holiday_name=name)
                db.add(h)
                count += 1
        db.commit()
        return {"message": f"Successfully imported {count} public holidays for {country} in {year}", "count": count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== Objection/Complaint Management ==============

class ObjectionResponse(BaseModel):
    id: int
    employee_id: int | None
    employee_name: str
    employee_email: str
    salary_month: int | None
    salary_year: int | None
    objection_subject: str
    objection_message: str
    objection_date: str
    is_resolved: bool
    resolved_date: str | None
    resolution_notes: str | None

class ObjectionResolve(BaseModel):
    resolution_notes: str | None = None


@app.get("/api/objections/")
def get_objections(
    db: Session = Depends(get_db),
    unresolved_only: bool = False,
    employee_id: int | None = None,
    current_user: User = Depends(get_current_active_user)
):
    """Get all objections or filter by unresolved/employee"""
    query = db.query(SalaryObjection)
    
    if unresolved_only:
        query = query.filter(SalaryObjection.is_resolved == False)
    
    if current_user.role == "employee":
        # Employee can only see their own objections
        if not current_user.employee_id:
            raise HTTPException(status_code=403, detail="Employee not linked to user")
        query = query.filter(SalaryObjection.employee_id == current_user.employee_id)
    elif employee_id is not None:
        query = query.filter(SalaryObjection.employee_id == employee_id)
    
    objections = query.order_by(SalaryObjection.objection_date.desc()).all()
    
    results = []
    for obj in objections:
        results.append({
            "id": obj.id,
            "employee_id": obj.employee_id,
            "employee_name": obj.employee_name,
            "employee_email": obj.employee_email,
            "salary_month": obj.salary_month,
            "salary_year": obj.salary_year,
            "objection_subject": obj.objection_subject,
            "objection_message": obj.objection_message,
            "objection_date": obj.objection_date.isoformat() if obj.objection_date else None,
            "is_resolved": obj.is_resolved,
            "resolved_date": obj.resolved_date.isoformat() if obj.resolved_date else None,
            "resolution_notes": obj.resolution_notes
        })
    
    return results


@app.get("/api/objections/{objection_id}")
def get_objection(objection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get a specific objection by ID"""
    objection = db.query(SalaryObjection).filter(SalaryObjection.id == objection_id).first()
    
    if not objection:
        raise HTTPException(status_code=404, detail="Objection not found")
    
    # Check authorization
    if current_user.role == "employee":
        if not current_user.employee_id or objection.employee_id != current_user.employee_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this objection")
    
    return {
        "id": objection.id,
        "employee_id": objection.employee_id,
        "employee_name": objection.employee_name,
        "employee_email": objection.employee_email,
        "salary_month": objection.salary_month,
        "salary_year": objection.salary_year,
        "objection_subject": objection.objection_subject,
        "objection_message": objection.objection_message,
        "objection_date": objection.objection_date.isoformat() if objection.objection_date else None,
        "is_resolved": objection.is_resolved,
        "resolved_date": objection.resolved_date.isoformat() if objection.resolved_date else None,
        "resolution_notes": objection.resolution_notes
    }


@app.put("/api/objections/{objection_id}/resolve")
def resolve_objection(objection_id: int, resolution: ObjectionResolve, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Mark an objection as resolved - only HR can do this"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    objection = db.query(SalaryObjection).filter(SalaryObjection.id == objection_id).first()
    
    if not objection:
        raise HTTPException(status_code=404, detail="Objection not found")
    
    objection.is_resolved = True
    objection.resolved_date = datetime.utcnow()
    objection.resolution_notes = resolution.resolution_notes
    
    db.commit()
    
    return {"message": "Objection marked as resolved"}


@app.get("/api/objections/stats/unresolved")
def get_unresolved_objections_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get count of unresolved objections - only HR can see this"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    count = db.query(SalaryObjection).filter(SalaryObjection.is_resolved == False).count()
    return {"unresolved_count": count}


@app.delete("/api/objections/{objection_id}")
def delete_objection(objection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Delete objection - only HR can do this"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    """Permanently delete an objection"""
    objection = db.query(SalaryObjection).filter(SalaryObjection.id == objection_id).first()
    if not objection:
        raise HTTPException(status_code=404, detail="Objection not found")
    
    db.delete(objection)
    db.commit()
    return {"message": "Objection deleted successfully"}


@app.get("/api/notifications/pending")
def get_pending_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get recent unresolved objections for notifications - only HR"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    # Get last 5 unresolved objections
    objections = db.query(SalaryObjection)\
        .filter(SalaryObjection.is_resolved == False)\
        .order_by(SalaryObjection.objection_date.desc())\
        .limit(5)\
        .all()
    
    notifications = []
    for obj in objections:
        notifications.append({
            "id": obj.id,
            "type": "objection",
            "message": f"Objection raised by {obj.employee_name}",
            "employee_name": obj.employee_name,
            "objection_date": obj.objection_date.isoformat() if obj.objection_date else None,
            "subject": obj.objection_subject
        })
    
    return {
        "total_unresolved": db.query(SalaryObjection).filter(SalaryObjection.is_resolved == False).count(),
        "notifications": notifications
    }
