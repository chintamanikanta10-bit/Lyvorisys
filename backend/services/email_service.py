import os
import smtplib
import email
from email.header import decode_header
from email.utils import parseaddr
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import imaplib
from datetime import datetime, timedelta

load_dotenv()

def send_salary_slip_email(employee_name, employee_email, month, year, attendance_summary, basic_salary, deductions, net_salary):
    if not employee_email:
        print(f"Skipping email for {employee_name} (no email provided)")
        return False
    
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    
    if not smtp_user or not smtp_password:
        print("SMTP credentials not configured in .env")
        return False
    
    try:
        month_names = {
            1: "January", 2: "February", 3: "March", 4: "April",
            5: "May", 6: "June", 7: "July", 8: "August",
            9: "September", 10: "October", 11: "November", 12: "December"
        }
        month_name = month_names.get(month, str(month))
        
        subject = f"Salary Slip - {month_name} {year} - {employee_name}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">Salary Slip</h1>
                </div>
                <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Dear {employee_name},</h2>
                    <p style="color: #475569; line-height: 1.6;">Please find your salary slip for the month of {month_name} {year} attached below.</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1e293b; margin-top: 0; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Salary Details</h3>
                        <table style="width: 100%; margin-top: 15px;">
                            <tr>
                                <td style="padding: 8px 0; color: #475569;"><strong>Employee Name:</strong></td>
                                <td style="padding: 8px 0; color: #1e293b;">{employee_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #475569;"><strong>Month:</strong></td>
                                <td style="padding: 8px 0; color: #1e293b;">{month_name} {year}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #475569;"><strong>Basic Salary:</strong></td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">₹{basic_salary:,.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #475569;"><strong>Deductions:</strong></td>
                                <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">₹{deductions:,.2f}</td>
                            </tr>
                            <tr style="border-top: 2px solid #e2e8f0;">
                                <td style="padding: 12px 0; color: #1e293b; font-size: 18px;"><strong>Net Salary:</strong></td>
                                <td style="padding: 12px 0; color: #2563eb; font-size: 18px; font-weight: bold;">₹{net_salary:,.2f}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e;">
                        <h4 style="color: #166534; margin-top: 0;">Attendance Summary</h4>
                        <p style="color: #15803d; margin: 5px 0;">{attendance_summary}</p>
                    </div>
                    
                    <p style="color: #94a3b8; margin-top: 30px; font-size: 14px;">If you have any questions regarding your salary slip, please reply to this email.</p>
                </div>
            </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = employee_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, employee_email, text)
        
        print(f"Successfully sent salary slip email to {employee_name} at {employee_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email to {employee_name}: {str(e)}")
        return False


def send_simple_email(to_email, subject, plain_text=None, html=None):
    """Send a simple email (plain text and/or HTML) using configured SMTP credentials."""
    if not to_email:
        print("No recipient provided for send_simple_email")
        return False

    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not smtp_user or not smtp_password:
        print("SMTP credentials not configured in .env")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject

        if plain_text:
            msg.attach(MIMEText(plain_text, 'plain'))
        if html:
            msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())

        print(f"Notification email sent to {to_email} (subject: {subject})")
        return True

    except Exception as e:
        print(f"Failed to send notification email to {to_email}: {str(e)}")
        return False


# IMAP Functions for reading incoming replies
def get_imap_connection():
    """Establish connection to IMAP server"""
    imap_host = os.getenv("IMAP_SERVER", "imap.gmail.com")
    imap_port = int(os.getenv("IMAP_PORT", "993"))
    imap_user = os.getenv("SMTP_USER")  # Same as SMTP user for Gmail
    imap_password = os.getenv("SMTP_PASSWORD")  # Same as SMTP password
    
    if not imap_user or not imap_password:
        print("IMAP credentials not configured")
        return None
    
    try:
        imap = imaplib.IMAP4_SSL(imap_host, imap_port)
        imap.login(imap_user, imap_password)
        print(f"Successfully connected to IMAP server: {imap_host}")
        return imap
    except Exception as e:
        print(f"Failed to connect to IMAP server: {str(e)}")
        return None


def fetch_unread_emails():
    """Fetch unread emails from inbox"""
    imap = get_imap_connection()
    if not imap:
        return []
    
    try:
        imap.select('INBOX')
        # Only fetch UNSEEN emails that have "Salary Slip" in the subject
        # This prevents the system from 'reading' or marking read unrelated personal/system emails
        # Use UID search for permanent, unique identifiers 
        status, messages = imap.uid('search', None, '(UNSEEN SUBJECT "Salary Slip")')

        email_list = []
        if status != 'OK' or not messages or not messages[0]:
            return []

        message_ids = messages[0].split()
        # Limit to the most recent 20 unread emails to avoid performance issues 
        # since we are no longer marking them as read.
        if len(message_ids) > 20:
            message_ids = message_ids[-20:]

        for msg_id in message_ids:
            try:
                # Use imap.uid('fetch') instead of imap.fetch()
                # Use BODY.PEEK[] to avoid automatically marking the email as read
                status, msg_data = imap.uid('fetch', msg_id, '(BODY.PEEK[])')
                if status != 'OK' or not msg_data:
                    print(f"Failed fetching message {msg_id}")
                    continue

                raw = msg_data[0][1]
                if not raw:
                    continue

                # Parse message from bytes
                msg = email.message_from_bytes(raw)

                # Decode subject
                raw_subject = msg.get('Subject', '')
                subject = ''
                if raw_subject:
                    dh = decode_header(raw_subject)
                    parts = []
                    for part, enc in dh:
                        if isinstance(part, bytes):
                            try:
                                parts.append(part.decode(enc or 'utf-8', errors='ignore'))
                            except Exception:
                                parts.append(part.decode('utf-8', errors='ignore'))
                        else:
                            parts.append(part)
                    subject = ''.join(parts)

                # Parse sender
                from_header = msg.get('From', '')
                name, addr = parseaddr(from_header)
                decoded_name = ''
                if name:
                    dn = decode_header(name)
                    dn_parts = []
                    for part, enc in dn:
                        if isinstance(part, bytes):
                            try:
                                dn_parts.append(part.decode(enc or 'utf-8', errors='ignore'))
                            except Exception:
                                dn_parts.append(part.decode('utf-8', errors='ignore'))
                        else:
                            dn_parts.append(part)
                    decoded_name = ''.join(dn_parts)

                body = get_email_body(msg)
                date = msg.get('Date', '')

                # Extract Message-ID
                message_id = msg.get('Message-ID', '')

                email_info = {
                    'uid': msg_id.decode('utf-8') if isinstance(msg_id, bytes) else str(msg_id),
                    'message_id': message_id,
                    'from': addr,
                    'from_name': decoded_name,
                    'subject': subject,
                    'body': body,
                    'date': date
                }
                email_list.append(email_info)
            except Exception as e:
                print(f"Error parsing message {msg_id}: {str(e)}")
                continue

        imap.close()
        return email_list
        
    except Exception as e:
        print(f"Error fetching unread emails: {str(e)}")
        return []
    finally:
        try:
            imap.logout()
        except:
            pass


def get_email_body(msg):
    """Extract plain text body from email message"""
    try:
        if msg.is_multipart():
            # Prefer plain text parts
            for part in msg.walk():
                ctype = part.get_content_type()
                disp = str(part.get('Content-Disposition') or '')
                if ctype == 'text/plain' and 'attachment' not in disp:
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or 'utf-8'
                        return payload.decode(charset, errors='ignore')

            # Fallback to first text/html
            for part in msg.walk():
                ctype = part.get_content_type()
                disp = str(part.get('Content-Disposition') or '')
                if ctype == 'text/html' and 'attachment' not in disp:
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or 'utf-8'
                        return payload.decode(charset, errors='ignore')
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or 'utf-8'
                return payload.decode(charset, errors='ignore')
    except Exception as e:
        print(f"Error extracting email body: {str(e)}")

    return ""


def mark_email_as_read(uid):
    """Mark an email as read by its UID"""
    imap = get_imap_connection()
    if not imap:
        return False
    
    try:
        imap.select('INBOX')
        # Use uid command since we are passing a UID
        imap.uid('store', uid, '+FLAGS', '\\Seen')
        imap.close()
        return True
    except Exception as e:
        print(f"Error marking email as read: {str(e)}")
        return False
    finally:
        try:
            imap.logout()
        except:
            pass
