from sqlalchemy.orm import Session
from sqlalchemy import extract, func
try:
    from backend.models.models import Employee, Attendance, LeaveBalance, SalaryRecord, Holiday
except ModuleNotFoundError:
    from models.models import Employee, Attendance, LeaveBalance, SalaryRecord, Holiday
import calendar

def calculate_monthly_salary(db: Session, target_month: int, target_year: int):
    employees = db.query(Employee).all()
    holiday_dates = {h.holiday_date for h in db.query(Holiday).all()}
    results = []
    
    for emp in employees:
        # Find earliest attendance year/month for this employee
        # Using a direct query to minimize data loaded
        earliest_att = db.query(Attendance).filter(Attendance.employee_id == emp.id).order_by(Attendance.attendance_date.asc()).first()
        
        if not earliest_att:
            continue
            
        start_year = earliest_att.attendance_date.year
        start_month = earliest_att.attendance_date.month
        
        curr_year = start_year
        curr_month = start_month
        
        previous_remaining_cl = 0.0
        previous_remaining_comp_off = 0.0
        
        while (curr_year < target_year) or (curr_year == target_year and curr_month <= target_month):
            att_records = db.query(Attendance).filter(
                Attendance.employee_id == emp.id,
                Attendance.month == curr_month,
                Attendance.year == curr_year
            ).order_by(Attendance.attendance_date.asc()).all()
            
            # If no attendance records for this month, we still want to maintain/carry forward the balances
            # and potentially add the monthly CL (if they are considered employed).
            # For simplicity, we create a dummy processing block or skip but update previous_remaining.
            
            if not att_records:
                # If skipping month, CL still accumulates?
                # Usually, yes. Let's add 1.0 CL and carry forward.
                previous_remaining_cl += 1.0
                if curr_month == 12:
                    curr_month = 1
                    curr_year += 1
                else:
                    curr_month += 1
                continue
                
            present_count = 0
            leave_days = 0
            sunday_count = 0
            holiday_count = 0
            monthly_comp_off_earned = 0
            
            print(f"--- START PROCESSING {emp.employee_id} ({emp.employee_name}) for {curr_month}/{curr_year} ---")
            
            for r in att_records:
                is_sunday = r.attendance_date.weekday() == 6
                is_holiday = r.attendance_date in holiday_dates
                
                # Non-working day flag
                is_non_working = is_sunday or is_holiday
                
                # Comp-Off Earning: ONLY if Present on Sunday/Holiday
                record_comp_off_added = 0
                if r.status == "Present" and is_non_working:
                    record_comp_off_added = 1
                    monthly_comp_off_earned += 1
                
                # Normalize status for working days calculation
                # If Excel says "Absent" on a Sunday, we should treat it as "Sunday" for working days logic
                effective_status = r.status
                if is_non_working and effective_status in ["Absent", "Leave"]:
                    # Do not count as leave day if it's a Sunday or Holiday
                    pass
                elif effective_status == "Present":
                    present_count += 1
                elif effective_status in ["Absent", "Leave"]:
                    leave_days += 1
                
                # Count non-working days for working_days deduction
                # If it's a Sunday or Holiday, we must ensure it's subtracted from total month days
                if is_sunday:
                    sunday_count += 1
                elif is_holiday:
                    holiday_count += 1
                    
                # Granular log as requested
                print(f"Employee ID: {emp.employee_id}")
                print(f"Date: {r.attendance_date}")
                print(f"Status: {r.status} (Effective: {'Non-Working' if is_non_working and r.status in ['Absent', 'Leave'] else r.status})")
                print(f"Comp-Off Added: {record_comp_off_added}")

            # Working days calculation
            _, total_days_in_month = calendar.monthrange(curr_year, curr_month)
            # Subtract Sundays and Holidays from total days
            working_days = total_days_in_month - sunday_count - holiday_count
            if working_days <= 0:
                working_days = 1
                
            current_month_cl = 1.0
            total_available_cl = previous_remaining_cl + current_month_cl
            total_available_comp_off = previous_remaining_comp_off + monthly_comp_off_earned
            
            # Comp-Off Usage: Comp-Off -> CL -> LOP
            current_leave_remaining = leave_days
            used_comp_off = 0.0
            used_cl = 0.0
            
            if current_leave_remaining > 0:
                can_use_comp_off = min(current_leave_remaining, total_available_comp_off)
                used_comp_off = can_use_comp_off
                current_leave_remaining -= can_use_comp_off
                
            if current_leave_remaining > 0:
                can_use_cl = min(current_leave_remaining, total_available_cl)
                used_cl = can_use_cl
                current_leave_remaining -= can_use_cl
                
            remaining_comp_off = total_available_comp_off - used_comp_off
            remaining_cl = total_available_cl - used_cl
            lop_days = current_leave_remaining
            
            # Summary logs as requested
            print(f"Comp-Off Balance: {remaining_comp_off}")
            print(f"Comp-Off Used: {used_comp_off}")
            print(f"LOP Applied: {lop_days}")
            print("-" * 30)

            # Update or create LeaveBalance
            lb = db.query(LeaveBalance).filter(
                LeaveBalance.employee_id == emp.id,
                LeaveBalance.month == curr_month,
                LeaveBalance.year == curr_year
            ).first()
            
            if not lb:
                lb = LeaveBalance(employee_id=emp.id, employee_name=emp.employee_name, month=curr_month, year=curr_year)
                db.add(lb)
                
            lb.monthly_cl = current_month_cl
            lb.carry_forward_cl = previous_remaining_cl
            lb.total_available_cl = total_available_cl
            lb.used_cl = used_cl
            lb.remaining_cl = remaining_cl
            lb.monthly_comp_off_earned = monthly_comp_off_earned
            lb.carry_forward_comp_off = previous_remaining_comp_off
            lb.total_available_comp_off = total_available_comp_off
            lb.used_comp_off = used_comp_off
            lb.remaining_comp_off = remaining_comp_off
            lb.lop_days = lop_days
            db.commit()
            
            # Calculate salary
            per_day_salary = emp.salary / working_days
            salary_deduction = lop_days * per_day_salary
            final_salary = emp.salary - salary_deduction
            
            # Update or create SalaryRecord
            sr = db.query(SalaryRecord).filter(
                SalaryRecord.employee_id == emp.id,
                SalaryRecord.month == curr_month,
                SalaryRecord.year == curr_year
            ).first()
            
            if not sr:
                sr = SalaryRecord(employee_id=emp.id, employee_name=emp.employee_name, month=curr_month, year=curr_year)
                db.add(sr)
                
            sr.working_days = working_days
            sr.present_days = present_count
            sr.leave_days = leave_days
            sr.lop_days = lop_days
            sr.salary_deduction = salary_deduction
            sr.final_salary = final_salary
            db.commit()
            
            if curr_year == target_year and curr_month == target_month:
                results.append({
                    "employee_id": emp.employee_id,
                    "employee_name": emp.employee_name,
                    "present_days": present_count,
                    "leave_days": leave_days,
                    "previous_cl": previous_remaining_cl,
                    "current_cl": current_month_cl,
                    "total_available_cl": total_available_cl,
                    "used_cl": used_cl,
                    "remaining_cl": remaining_cl,
                    "previous_comp_off": previous_remaining_comp_off,
                    "monthly_comp_off_earned": monthly_comp_off_earned,
                    "total_available_comp_off": total_available_comp_off,
                    "used_comp_off": used_comp_off,
                    "remaining_comp_off": remaining_comp_off,
                    "lop_days": lop_days,
                    "deduction": salary_deduction,
                    "final_salary": final_salary
                })
                
            previous_remaining_cl = remaining_cl
            previous_remaining_comp_off = remaining_comp_off
            
            # Advance to next month
            if curr_month == 12:
                curr_month = 1
                curr_year += 1
            else:
                curr_month += 1
                
    return results
