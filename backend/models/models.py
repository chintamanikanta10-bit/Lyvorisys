from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Boolean, Time, DateTime
from sqlalchemy.orm import relationship
try:
    from backend.database.database import Base
except ModuleNotFoundError:
    from database.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="hr")  # "hr" or "employee"
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    employee = relationship("Employee", foreign_keys=[employee_id])

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    employee_name = Column(String)
    department = Column(String)
    salary = Column(Float)
    joining_date = Column(Date)
    email = Column(String, nullable=True)
    
    attendances = relationship("Attendance", back_populates="employee")
    leave_balances = relationship("LeaveBalance", back_populates="employee")
    salary_records = relationship("SalaryRecord", back_populates="employee")


class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    employee_name = Column(String)
    attendance_date = Column(Date)
    in_time = Column(Time, nullable=True)
    out_time = Column(Time, nullable=True)
    month = Column(Integer, index=True)
    year = Column(Integer, index=True)
    status = Column(String) # Present, Leave, Holiday, Sunday
    source_file = Column(String, index=True)
    
    employee = relationship("Employee", back_populates="attendances")

class Holiday(Base):
    __tablename__ = "holidays"
    id = Column(Integer, primary_key=True, index=True)
    holiday_name = Column(String)
    holiday_date = Column(Date, unique=True)

class LeaveBalance(Base):
    __tablename__ = "leave_balance"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    employee_name = Column(String)
    month = Column(Integer)
    year = Column(Integer)
    monthly_cl = Column(Float, default=1.0)
    carry_forward_cl = Column(Float, default=0.0)
    total_available_cl = Column(Float, default=1.0)
    used_cl = Column(Float, default=0.0)
    remaining_cl = Column(Float, default=1.0)
    monthly_comp_off_earned = Column(Float, default=0.0)
    carry_forward_comp_off = Column(Float, default=0.0)
    total_available_comp_off = Column(Float, default=0.0)
    used_comp_off = Column(Float, default=0.0)
    remaining_comp_off = Column(Float, default=0.0)
    lop_days = Column(Float, default=0.0)
    
    employee = relationship("Employee", back_populates="leave_balances")

class SalaryRecord(Base):
    __tablename__ = "salary"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    employee_name = Column(String)
    month = Column(Integer)
    year = Column(Integer)
    working_days = Column(Integer)
    present_days = Column(Integer)
    leave_days = Column(Integer)
    lop_days = Column(Float)
    salary_deduction = Column(Float, default=0.0)
    final_salary = Column(Float)
    
    employee = relationship("Employee", back_populates="salary_records")

class UploadedFileDB(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, unique=True, index=True)
    month = Column(Integer)
    year = Column(Integer)
    upload_date = Column(Date)
    total_employees = Column(Integer, default=0)

class SalaryObjection(Base):
    __tablename__ = "salary_objections"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    employee_name = Column(String)
    employee_email = Column(String)
    salary_month = Column(Integer)
    salary_year = Column(Integer)
    objection_subject = Column(String)
    objection_message = Column(String)
    objection_date = Column(DateTime, default=datetime.utcnow)
    is_resolved = Column(Boolean, default=False)
    resolved_date = Column(DateTime, nullable=True)
    resolution_notes = Column(String, nullable=True)
    email_uid = Column(String, nullable=True, index=True)  # IMAP email UID to avoid duplicates
    message_id = Column(String, nullable=True, index=True) # Globally unique Email-ID for deduplication
    
    employee = relationship("Employee", foreign_keys=[employee_id])
