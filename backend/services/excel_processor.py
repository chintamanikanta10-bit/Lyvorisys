import pandas as pd
import os
from datetime import datetime
from sqlalchemy.orm import Session
try:
    from backend.models.models import Employee, Attendance, Holiday
except ModuleNotFoundError:
    from models.models import Employee, Attendance, Holiday

def process_attendance_excel(file_path: str, db: Session):
    """
    Processes the NEW Excel format ONLY.
    Structure:
    | Employee ID | Employee Name | 01/09/2026 | 02/09/2026 | ... |
    | EMP001      | Name A        | Present    | Leave      | ... |
    """
    try:
        # 1. Read Excel
        df = pd.read_excel(file_path)
    except Exception as e:
        raise ValueError(f"Unable to read Excel file: {str(e)}")

    # Normalize column names
    df.columns = df.columns.astype(str).str.strip()

    # Map common column name variants to the expected names
    column_aliases = {
        'employee id': 'Employee ID',
        'id': 'Employee ID',
        'emp id': 'Employee ID',
        'employee_id': 'Employee ID',
        'employee name': 'Employee Name',
        'name': 'Employee Name',
        'emp name': 'Employee Name',
        'employee_name': 'Employee Name',
    }
    rename_map = {}
    for col in df.columns:
        alias = column_aliases.get(str(col).strip().lower())
        if alias:
            rename_map[col] = alias
    if rename_map:
        df = df.rename(columns=rename_map)
    filename = os.path.basename(file_path)
    
    # 2. Get Holidays for Sunday/Holiday detection logs
    holiday_dates = {h.holiday_date for h in db.query(Holiday.holiday_date).all()}
    
    # 3. Map Employees from DB
    all_emps_db = db.query(Employee.id, Employee.employee_id, Employee.employee_name).all()
    emp_by_id = {str(e.employee_id).strip().lower(): e.id for e in all_emps_db}
    emp_by_name = {str(e.employee_name).strip().lower(): e.id for e in all_emps_db}
    
    # 4. Identify date columns dynamically
    date_cols = []
    mapped_dates = {} # column_name -> date object
    
    for col in df.columns:
        col_str = str(col).strip()
        # Skip known non-date columns
        if col_str.lower() in ('employee id', 'employee name', 'id', 'name', 'dept', 'department', 'total'):
            continue
            
        try:
            # Parse date (DD/MM/YYYY support)
            parsed_date = pd.to_datetime(col_str, dayfirst=True, errors='raise').date()
            date_cols.append(col)
            mapped_dates[col] = parsed_date
        except (ValueError, TypeError):
            continue
            
    # --- VALIDATION ---
    if 'Employee ID' not in df.columns or 'Employee Name' not in df.columns:
        raise ValueError(f"Missing required columns 'Employee ID' or 'Employee Name' in {filename}")

    if not date_cols:
        raise ValueError(f"No valid date columns found in {filename}. Ensure dates are in DD/MM/YYYY format.")

    # Overall month/year from first date column
    overall_min_date = min(mapped_dates.values())
    
    attendance_dicts = []
    seen = set() # (emp_id, date)
    
    # 5. Iterate rows
    records = df.to_dict('records')
    for row in records:
        raw_emp_id = str(row.get('Employee ID', '')).strip()
        raw_emp_name = str(row.get('Employee Name', '')).strip()
        
        if not raw_emp_id or raw_emp_id.lower() == 'nan':
            continue # Skip malformed rows with no ID
            
        emp_id_key = raw_emp_id.lower()
        emp_name_key = raw_emp_name.lower()
        
        # Match employee
        db_emp_id = emp_by_id.get(emp_id_key) or emp_by_name.get(emp_name_key)
        if not db_emp_id:
            print(f"WARNING: Unknown employee in Excel: {raw_emp_id} {raw_emp_name}")
            continue
            
        for col in date_cols:
            status_raw = row.get(col)
            if pd.isna(status_raw):
                continue
                
            status_str = str(status_raw).strip()
            if not status_str or status_str.lower() in ('nan', 'nat', 'null', ''):
                continue
            
            att_date = mapped_dates[col]
            
            # --- STATUS NORMALIZATION ---
            norm_status = status_str.title()
            if norm_status == "Halfday": norm_status = "Half Day"
            
            valid_statuses = ["Present", "Absent", "Leave", "Holiday", "Sunday", "Half Day"]
            if norm_status not in valid_statuses:
                # Reject if fundamentally invalid
                print(f"VALIDATION ERROR: Invalid status '{status_str}' for {raw_emp_id} on {att_date}")
                continue

            # --- DEBUG LOGGING ---
            is_sunday = att_date.weekday() == 6
            is_holiday = att_date in holiday_dates
            print(f"EMP: {raw_emp_id} | DATE: {att_date} | STATUS: {norm_status} | IS_SUNDAY: {is_sunday} | IS_HOLIDAY: {is_holiday}")
            
            key = (db_emp_id, att_date)
            if key not in seen:
                attendance_dicts.append({
                    "employee_id": db_emp_id,
                    "employee_name": raw_emp_name,
                    "attendance_date": att_date,
                    "in_time": None,
                    "out_time": None,
                    "month": att_date.month,
                    "year": att_date.year,
                    "status": norm_status,
                    "source_file": filename
                })
                seen.add(key)

    if not attendance_dicts:
        raise ValueError(
            f"No attendance records imported from {filename}. "
            "Check that Employee ID/Name match employees in the system and "
            "date columns use DD/MM/YYYY format with valid status values."
        )
        
    # --- DUPLICATE HANDLING ---
    # Delete existing records for (employee_id + attendance_date) to prevent duplicates and allow updates.
    emp_ids = list({d['employee_id'] for d in attendance_dicts})
    all_dates = list({d['attendance_date'] for d in attendance_dicts})
    
    db.query(Attendance).filter(
        Attendance.employee_id.in_(emp_ids),
        Attendance.attendance_date.in_(all_dates)
    ).delete(synchronize_session=False)
    
    # 6. Bulk Insert
    db.bulk_insert_mappings(Attendance, attendance_dicts)
    db.commit()
    
    return len(attendance_dicts), overall_min_date.month, overall_min_date.year
