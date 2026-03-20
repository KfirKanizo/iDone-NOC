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
    html_body: Optional[str] = None,
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

    if html_body:
        msg.add_alternative(html_body, subtype='html')

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

    html_body = """<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>🔴 NOC Incident Alert</title>
  <style>
    body {{
      background: #fdecea;
      font-family: 'Assistant', Arial, sans-serif;
      margin: 0;
      padding: 0;
      direction: ltr;
    }}
    .container {{
      max-width: 520px;
      margin: 40px auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px #0002;
      padding: 32px 28px;
      border-left: 8px solid #dc3545;
    }}
    .logo {{
      text-align: left;
      margin-bottom: 18px;
    }}
    .logo img {{
      height: 100px;
    }}
    h2 {{
      color: #dc3545;
      font-size: 24px;
      margin: 0 0 18px 0;
      font-weight: bold;
    }}
    .content {{
      font-size: 18px;
      color: #212529;
      line-height: 1.7;
      margin-bottom: 28px;
    }}
    .error-info {{
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #dc3545;
    }}
    .error-title {{
      color: #dc3545;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
    }}
    .call-to-action {{
      text-align: center;
      margin: 28px 0;
      padding: 15px;
      background: #fff3cd;
      color: #856404;
      border-radius: 6px;
      font-weight: bold;
      border: 1px solid #ffeeba;
    }}
    .footer {{
      margin-top: 40px;
      font-size: 14px;
      color: #8b9bac;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <a href="https://www.idone.co.il" target="_blank">
        <img src="https://www.idone.co.il/assets/images/logos/idone-logo.png" alt="iDone" />
      </a>
    </div>
    <h2>⚠️ NOC Incident Alert</h2>
    <div class="content">
      A critical incident has been detected and requires your immediate attention.<br><br>
      <strong>Incident ID:</strong> {incident_id}
    </div>
    <div class="error-info">
      <div class="error-title">📋 Incident Details</div>
      <div class="content" style="white-space: pre-wrap; text-align: left; font-family: monospace; font-size: 15px; margin-bottom: 0;">{incident_details}</div>
    </div>
    <div class="call-to-action">
      📞 Please acknowledge this incident by pressing 1 when you receive the phone call.
    </div>
    <div class="footer">
      <b>NOC Platform - iDone Team</b>
    </div>
  </div>
</body>
</html>""".format(incident_id=incident_id, incident_details=incident_details)

    return send_email(to_email, subject, body, html_body=html_body)
