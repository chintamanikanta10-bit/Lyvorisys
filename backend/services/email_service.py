import os
import email
from email.header import decode_header
from email.utils import parseaddr
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from dotenv import load_dotenv
import imaplib
from datetime import datetime, timedelta

load_dotenv()

def send_salary_slip_email(employee_name, employee_email, month, year, attendance_summary, basic_salary, deductions, net_salary):
    if not employee_email:
        print(f"Skipping email for {employee_name} (no email provided)")
        return False
    api_key=os.getenv("BREVO_API_KEY")
    sender=os.getenv("SMTP_USER","kamakshikamalika@gmail.com")
    if not api_key:
        print("BREVO_API_KEY missing")
        return False
    month_names={1:"January",2:"February",3:"March",4:"April",5:"May",6:"June",7:"July",8:"August",9:"September",10:"October",11:"November",12:"December"}
    month_name=month_names.get(month,str(month))
    html_content=f"<h2>Salary Slip</h2><p>Dear {employee_name},</p><p><b>Month:</b> {month_name} {year}</p><p><b>Basic Salary:</b> ₹{basic_salary:,.2f}</p><p><b>Deductions:</b> ₹{deductions:,.2f}</p><p><b>Net Salary:</b> ₹{net_salary:,.2f}</p><p>{attendance_summary}</p>"
    configuration=sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key']=api_key
    api=sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
    email_obj=sib_api_v3_sdk.SendSmtpEmail(
        sender={"email":sender,"name":"Lyvorisys HR"},
        to=[{"email":employee_email,"name":employee_name}],
        subject=f"Salary Slip - {month_name} {year}",
        html_content=html_content)
    try:
        api.send_transac_email(email_obj)
        print("Brevo email sent")
        return True
    except ApiException as e:
        print(f"Brevo Error: {e}")
        return False

def send_simple_email(to_email, subject, plain_text=None, html=None):
    if not to_email:
        return False
    api_key=os.getenv("BREVO_API_KEY")
    sender=os.getenv("SMTP_USER","kamakshikamalika@gmail.com")
    configuration=sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key']=api_key
    api=sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
    content=html if html else f"<pre>{plain_text or ''}</pre>"
    email_obj=sib_api_v3_sdk.SendSmtpEmail(sender={"email":sender,"name":"Lyvorisys HR"},to=[{"email":to_email}],subject=subject,html_content=content)
    try:
        api.send_transac_email(email_obj)
        return True
    except ApiException as e:
        print(e)
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
