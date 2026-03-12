import smtplib
import logging
from email.message import EmailMessage
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None,
) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured, skipping email")
        return False

    from_email = from_email or settings.SMTP_USER

    msg = EmailMessage()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_incident_alert_email(
    to_email: str,
    incident_id: str,
    incident_details: str,
) -> bool:
    subject = f"🔴 NOC Alert: Incident {incident_id[:8]}"
    body = f"""NOC Incident Alert

Incident ID: {incident_id}
Details: {incident_details}

Please acknowledge this incident by pressing 1 when you receive the phone call.

---
NOC Platform
"""
    return send_email(to_email, subject, body)
