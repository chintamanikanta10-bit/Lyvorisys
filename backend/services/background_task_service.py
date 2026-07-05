import os
import re
from datetime import datetime
from sqlalchemy.orm import Session
try:
    from backend.models.models import SalaryObjection, Employee
    from backend.services.email_service import fetch_unread_emails, mark_email_as_read, send_simple_email
    from backend.database.database import SessionLocal
except ModuleNotFoundError:
    from models.models import SalaryObjection, Employee
    from services.email_service import fetch_unread_emails, mark_email_as_read, send_simple_email
    from database.database import SessionLocal
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv()

scheduler = BackgroundScheduler(daemon=True)


def extract_salary_month_year_from_subject(subject):
    """
    Extract month and year from email subject like 'Salary Slip - January 2026 - John Doe'
    Returns tuple (month, year) or (None, None)
    """
    months = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    }
    
    subject_lower = subject.lower()
    
    # Try to find month and year pattern
    for month_name, month_num in months.items():
        if month_name in subject_lower:
            # Look for year (4 digits) after the month
            year_pattern = r'\d{4}'
            year_matches = re.findall(year_pattern, subject)
            if year_matches:
                year = int(year_matches[0])
                return month_num, year
    
    return None, None


def match_employee_by_email(db: Session, employee_email: str):
    """Find employee by email address"""
    from sqlalchemy import func
    employee = db.query(Employee).filter(func.lower(Employee.email) == employee_email.lower()).first()
    return employee


def process_unread_emails():
    """
    Fetch unread emails and create objection records
    Called periodically by APScheduler
    """
    db = SessionLocal()
    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now}] [Background Task] Starting email processing...")
        
        # Fetch unread emails from IMAP
        unread_emails = fetch_unread_emails()
        
        if not unread_emails:
            # print("[Background Task] No unread emails found")
            return
        
        print(f"[Background Task] Found {len(unread_emails)} unread emails with 'Salary Slip' in subject")
        
        for email_data in unread_emails:
            try:
                sender_email = email_data.get('from', '').lower()
                subject = email_data.get('subject', '')
                body = email_data.get('body', '')
                uid = email_data.get('uid', '')
                message_id = email_data.get('message_id', '')
                
                print(f"[Background Task] Checking email: UID={uid}, Message-ID={message_id}, Subject='{subject}'")
                
                # Skip if no valid sender email
                if not sender_email or '@' not in sender_email:
                    print(f"[Background Task] Skipping email with invalid sender: {sender_email}")
                    continue
                
                # IMPORTANT SELF-EMAIL FILTER: Skip if sender is the system email to avoid loops
                system_email = (os.getenv("SMTP_USER") or "").lower()
                if sender_email == system_email:
                    print(f"[Background Task] Skipping self-generated email from: {sender_email}")
                    continue
                
                # Try to match employee by email
                employee = match_employee_by_email(db, sender_email)

                # Extract month and year from original salary slip email subject
                month, year = extract_salary_month_year_from_subject(subject)

                # Check if this email was already processed by UID
                existing_by_uid = db.query(SalaryObjection).filter(
                    SalaryObjection.email_uid == uid
                ).first()
                
                if existing_by_uid:
                    print(f"[Background Task] Skipping: UID {uid} already recorded.")
                    continue

                # NEW: Check by Message-ID for globally unique deduplication
                if message_id:
                    existing_by_msgid = db.query(SalaryObjection).filter(
                        SalaryObjection.message_id == message_id
                    ).first()
                    
                    if existing_by_msgid:
                        print(f"[Background Task] Skipping: Message-ID {message_id} already processed.")
                        continue

                # Check if there's already an UNRESOLVED objection for this employee/month/year
                if month and year:
                    existing_objection = db.query(SalaryObjection).filter(
                        SalaryObjection.employee_email == sender_email,
                        SalaryObjection.salary_month == month,
                        SalaryObjection.salary_year == year,
                        SalaryObjection.is_resolved == False
                    ).first()
                    
                    if existing_objection:
                        print(f"[Background Task] Skipping: Unresolved objection already exists for {sender_email} ({month}/{year}).")
                        continue


                # If the IMAP search found it, and it hasn't been processed (existing_objection check above),
                # we treat it as a valid notification/objection as long as it has a sender.
                is_objection = True
                print(f"[Background Task] Processing email: UID={uid}, Subject='{subject}', From='{sender_email}'")

                # Create objection record
                objection = SalaryObjection(
                    employee_id=employee.id if employee else None,
                    employee_name=employee.employee_name if employee else sender_email.split('@')[0],
                    employee_email=sender_email,
                    salary_month=month,
                    salary_year=year,
                    objection_subject=subject,
                    objection_message=body[:500],  # Store first 500 chars
                    email_uid=uid,
                    message_id=message_id,
                    objection_date=datetime.utcnow()
                )
                
                db.add(objection)
                db.commit()
                
                print(f"[Background Task] Created objection for {sender_email}")

                # Objection successfully created. 
                # Mark as read is disabled as per user request to keep emails UNREAD in inbox.
                pass
                
            except Exception as e:
                print(f"[Background Task] Error processing email: {str(e)}")
                db.rollback()
                continue
        
        print("[Background Task] Email processing completed")
        
    except Exception as e:
        print(f"[Background Task] Error in process_unread_emails: {str(e)}")
    finally:
        db.close()


def start_background_scheduler():
    """Start the background scheduler for periodic email checking"""
    
    # Check if scheduler is already running
    if scheduler.running:
        print("[Background Task] Scheduler already running")
        return
    
    try:
        # Schedule email processing every 2 minutes
        # You can adjust the interval in main.py or environment variables
        interval_minutes = int(os.getenv("EMAIL_CHECK_INTERVAL", "2"))
        
        scheduler.add_job(
            func=process_unread_emails,
            trigger="interval",
            minutes=interval_minutes,
            id="email_processor",
            name="Email Processor",
            replace_existing=True
        )
        
        scheduler.start()
        print(f"[Background Task] Scheduler started - checking emails every {interval_minutes} minutes")
        
    except Exception as e:
        print(f"[Background Task] Error starting scheduler: {str(e)}")


def stop_background_scheduler():
    """Stop the background scheduler"""
    try:
        if scheduler.running:
            scheduler.shutdown()
            print("[Background Task] Scheduler stopped")
    except Exception as e:
        print(f"[Background Task] Error stopping scheduler: {str(e)}")
