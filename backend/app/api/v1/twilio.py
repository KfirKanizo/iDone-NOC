import logging
from fastapi import APIRouter, Depends, Query, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from twilio.twiml.voice_response import VoiceResponse

from app.database import get_db
from app.models import Incident, EscalationPolicy, IncidentLog, ActionType, IncidentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/twilio", tags=["twilio"])

CALLBACK_STRINGS = {
    "en-US": {
        "not_found": "Incident not found. Goodbye.",
        "already_acknowledged": "This incident has already been acknowledged. Goodbye.",
        "acknowledged": "Thank you. You have acknowledged this incident. We will notify you of any updates.",
        "invalid_input": "Invalid input. Please press 1 to acknowledge the incident.",
    },
    "he-IL": {
        "not_found": "האירוע לא נמצא. להתראות.",
        "already_acknowledged": "האירוע כבר אושר. להתראות.",
        "acknowledged": "תודה. אישרת קבלת האירוע. נעדכן אותך בכל שינוי.",
        "invalid_input": "קלט לא חוקי. אנא הקש 1 לאישור קבלת ההתראה.",
    },
}


@router.post("/callback")
def twilio_callback(
    incident_id: str = Query(...),
    CallSid: str = Form(None),
    Digits: str = Form(None),
    db: Session = Depends(get_db),
):
    logger.info(f"Twilio callback received: incident_id={incident_id}, CallSid={CallSid}, Digits={Digits}")
    
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).with_for_update().first()
    
    if not incident:
        logger.warning(f"Incident not found: {incident_id}")
        response = VoiceResponse()
        response.say("Incident not found. Goodbye.", language="en-US")
        return Response(content=str(response), media_type="application/xml")
    
    logger.info(f"Incident found: {incident.id}, current status: {incident.status}")
    
    policy = db.query(EscalationPolicy).filter(
        EscalationPolicy.id == incident.policy_id
    ).first()
    
    contact = policy.get_contact_for_level(0) if policy else None
    language = getattr(contact, 'language', 'en-US') if contact else 'en-US'
    strings = CALLBACK_STRINGS.get(language, CALLBACK_STRINGS["en-US"])
    
    response = VoiceResponse()
    
    if incident.status != IncidentStatus.OPEN:
        logger.info(f"Incident {incident_id} is not OPEN (status: {incident.status}), already acknowledged")
        response.say(strings["already_acknowledged"], language=language)
        return Response(content=str(response), media_type="application/xml")
    
    if Digits == "1":
        logger.info(f"Updating incident {incident_id} to ACKNOWLEDGED")
        incident.status = IncidentStatus.ACKNOWLEDGED
        
        log_entry = IncidentLog(
            incident_id=incident.id,
            action_type=ActionType.ACKNOWLEDGED,
            details={
                "call_sid": CallSid,
                "digits_pressed": Digits,
                "method": "twilio_callback",
                "language": language,
            },
        )
        db.add(log_entry)
        db.commit()
        logger.info(f"Incident {incident_id} successfully acknowledged")
        
        response.say(strings["acknowledged"], language=language)
    else:
        logger.info(f"Invalid digits received: {Digits}, re-prompting")
        response.say(strings["invalid_input"], language=language)
        response.redirect("/api/v1/twilio/callback?incident_id=" + incident_id)
    
    return Response(content=str(response), media_type="application/xml")


@router.post("/status")
def twilio_status(
    incident_id: str = Query(...),
    CallSid: str = Form(None),
    CallStatus: str = Form(None),
    db: Session = Depends(get_db),
):
    logger.info(f"Twilio status callback: incident_id={incident_id}, CallSid={CallSid}, CallStatus={CallStatus}")
    return {"status": "received", "call_status": CallStatus}
