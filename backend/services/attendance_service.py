from datetime import date

def determine_attendance_status(att_date: date, in_time, out_time, holiday_dates: dict) -> str:
    # Rule 1 - Present (Take from Excel strictly)
    if in_time is not None and out_time is not None:
        return "Present"
        
    # Rule 2 - Sunday (If missing times, default to Sunday to avoid incorrect absences)
    if att_date.weekday() == 6:
        return "Sunday"
        
    # Rule 3 - Public Holiday (missing times => Holiday status preserved)
    if att_date in holiday_dates:
        return "Holiday"
        
    # Rule 4 - Absent Detection (Both missing or partially missing = Absent/Leave)
    return "Absent"
