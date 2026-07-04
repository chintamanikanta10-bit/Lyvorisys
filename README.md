# Smart Employee Attendance & Salary Processing System

## Overview
A high-performance full-stack web application designed to process monthly biometric attendance Excel sheets and automatically calculate attendance stats, leave balances, and final salary.

## Features Added:
- FastAPI Backend (High-performance API)
- React Frontend (Vite + Tailwind CSS + Lucide React for modern UI)
- SQLite Database via SQLAlchemy (Easily swappable to PostgreSQL)
- Attendance upload & automatic parsing (Rules: Present, Absent, Leave, Holiday, Sunday, Half Day)
- New Format Support: Dates as columns, mapping status directly from Excel cells.
- Employee Salary calculations based on Working Days and Carry Forward CL logic.

## Recommended Tech Stack (Implemented):
- **Frontend**: React.js, Vanilla CSS
- **Backend**: FastAPI
- **Database**: SQLite (Ready for PostgreSQL)
- **Data Processing**: pandas, openpyxl

## Setup Instructions

### 1. Backend Setup:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
(Backend will run at http://localhost:8000)

### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
(Frontend will run at http://localhost:5173)

### 3. Usage:
1. Open the Frontend URL.
2. Go to "Attendance Upload".
3. Upload an Excel file in the NEW format (Employee ID, Employee Name, and Date Columns).
4. Go to "Salary Reports", select the Month and Year, and click "Run Processing".
5. The system will calculate Present days, Leaves, Holidays, CL Used, LOP days, and Final Salary.

## Important Logic Implementations:
- **Rule 1 (Status Mapping)**: Statuses are read directly from Excel (Present, Absent, Leave, Holiday, Sunday, Half Day). Casing and spaces are normalized.
- **Rule 2/3 (Holidays/Sundays)**: Dates are identified dynamically from column headers.
- **Rule 5/6 (Leaves/CL)**: Uses a rolling LeaveBalance table updating available, used, and carry_forward entries dynamically.
- **Rule 7 (LOP & Salary Calculation)**: Working days calculated automatically using `(Total Days - Holidays - Sundays)`. Per day salary mapped, and mapped against `LOP = Leaves - Available CL - Available Comp-Off`.
- **Rule 8 (Comp-Off)**: Automatically earned when an employee is marked "Present" on a Sunday or Public Holiday.

