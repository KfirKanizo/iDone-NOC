import logging
from celery import shared_task
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Incident, EscalationPolicy, IncidentLog, ActionType, IncidentStatus
from app.services.email_service import send_incident_alert_email
from app.services.twilio_service import initiate_escalation_call

logger = logging.getLogger(__name__)


def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_escalation_step(self, incident_id: str):
    db = SessionLocal()
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        
        if not incident:
            logger.error(f"Incident {incident_id} not found")
            return
        
        if incident.status != IncidentStatus.OPEN:
            logger.info(f"Incident {incident_id} is not OPEN (status: {incident.status}), skipping")
            return
        
        policy = db.query(EscalationPolicy).filter(
            EscalationPolicy.id == incident.policy_id
        ).first()
        
        if not policy:
            logger.error(f"Policy {incident.policy_id} not found for incident {incident_id}")
            incident.status = IncidentStatus.FAILED_ESCALATION
            db.commit()
            return
        
        level = incident.current_escalation_level
        contact = policy.get_contact_for_level(level)
        
        if not contact:
            logger.warning(f"No contact found for level {level} in policy {policy.id}")
            incident.status = IncidentStatus.FAILED_ESCALATION
            db.commit()
            return
        
        if incident.current_retry_count == 0:
            incident_details = incident.payload.get("details", "No details provided")
            email_sent = send_incident_alert_email(
                to_email=contact.email,
                incident_id=str(incident.id),
                incident_details=incident_details,
            )
            
            log_entry = IncidentLog(
                incident_id=incident.id,
                action_type=ActionType.EMAIL_SENT,
                details={"contact_id": str(contact.id), "email": contact.email, "sent": email_sent},
            )
            db.add(log_entry)
            db.commit()
        
        tts_message = policy.tts_message_template.format(
            incident_details=incident.payload.get("details", "Alert"),
        )
        
        call_sid = initiate_escalation_call(
            to_number=contact.phone_number,
            text_to_say=tts_message,
            incident_id=str(incident.id),
        )
        
        log_entry = IncidentLog(
            incident_id=incident.id,
            action_type=ActionType.CALL_INITIATED,
            details={
                "contact_id": str(contact.id),
                "phone_number": contact.phone_number,
                "call_sid": call_sid,
            },
        )
        db.add(log_entry)
        db.commit()
        
        from app.celery_app import celery_app
        celery_app.send_task(
            "app.tasks.escalation_tasks.evaluate_retry_or_escalate",
            args=[str(incident_id)],
            countdown=policy.retry_delay_seconds,
        )
        
        logger.info(f"Scheduled evaluation for incident {incident_id} after {policy.retry_delay_seconds}s")
        
    except Exception as e:
        logger.error(f"Error in process_escalation_step for {incident_id}: {e}")
        db.rollback()
        raise self.retry(exc=e)
    finally:
        db.close()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def evaluate_retry_or_escalate(self, incident_id: str):
    db = SessionLocal()
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        
        if not incident:
            logger.error(f"Incident {incident_id} not found")
            return
        
        if incident.status != IncidentStatus.OPEN:
            logger.info(f"Incident {incident_id} is not OPEN (status: {incident.status}), skipping")
            return
        
        policy = db.query(EscalationPolicy).filter(
            EscalationPolicy.id == incident.policy_id
        ).first()
        
        if not policy:
            logger.error(f"Policy {incident.policy_id} not found")
            incident.status = IncidentStatus.FAILED_ESCALATION
            db.commit()
            return
        
        incident.current_retry_count += 1
        
        if incident.current_retry_count < policy.max_retries_per_level:
            logger.info(f"Incident {incident_id} retry {incident.current_retry_count}/{policy.max_retries_per_level}")
            db.commit()
            process_escalation_step.delay(str(incident_id))
        else:
            log_entry = IncidentLog(
                incident_id=incident.id,
                action_type=ActionType.MAX_RETRIES_REACHED,
                details={
                    "level": incident.current_escalation_level,
                    "retry_count": incident.current_retry_count,
                },
            )
            db.add(log_entry)
            
            incident.current_retry_count = 0
            incident.current_escalation_level += 1
            
            if incident.current_escalation_level > 5:
                logger.warning(f"Incident {incident_id} exceeded max escalation levels")
                incident.status = IncidentStatus.FAILED_ESCALATION
                
                fail_log = IncidentLog(
                    incident_id=incident.id,
                    action_type=ActionType.MAX_RETRIES_REACHED,
                    details={"reason": "Max escalation level reached (5)"},
                )
                db.add(fail_log)
            else:
                next_contact = policy.get_contact_for_level(incident.current_escalation_level)
                if not next_contact:
                    logger.warning(f"No contact at level {incident.current_escalation_level}, marking as failed")
                    incident.status = IncidentStatus.FAILED_ESCALATION
                    
                    fail_log = IncidentLog(
                        incident_id=incident.id,
                        action_type=ActionType.MAX_RETRIES_REACHED,
                        details={"reason": f"No contact at level {incident.current_escalation_level}"},
                    )
                    db.add(fail_log)
                else:
                    escalate_log = IncidentLog(
                        incident_id=incident.id,
                        action_type=ActionType.ESCALATED,
                        details={
                            "from_level": incident.current_escalation_level - 1,
                            "to_level": incident.current_escalation_level,
                            "contact_id": str(next_contact.id),
                        },
                    )
                    db.add(escalate_log)
                    db.commit()
                    process_escalation_step.delay(str(incident_id))
                    logger.info(f"Escalated incident {incident_id} to level {incident.current_escalation_level}")
                    return
            
            db.commit()
        
    except Exception as e:
        logger.error(f"Error in evaluate_retry_or_escalate for {incident_id}: {e}")
        db.rollback()
        raise self.retry(exc=e)
    finally:
        db.close()
