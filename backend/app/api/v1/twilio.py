import logging
from fastapi import APIRouter, Depends, Query, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from twilio.twiml.voice_response import VoiceResponse

from app.database import get_db
from app.models import Incident, Contact, IncidentLog, ActionType, IncidentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/twilio", tags=["twilio"])


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
        response.say("Incident not found. Goodbye.")
        return Response(content=str(response), media_type="application/xml")
    
    logger.info(f"Incident found: {incident.id}, current status: {incident.status}")
    
    response = VoiceResponse()
    
    if incident.status != IncidentStatus.OPEN:
        logger.info(f"Incident {incident_id} is not OPEN (status: {incident.status}), already acknowledged")
        response.say("This incident has already been acknowledged. Goodbye.")
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
            },
        )
        db.add(log_entry)
        db.commit()
        logger.info(f"Incident {incident_id} successfully acknowledged")
        
        response.say("Thank you. You have acknowledged this incident. We will notify you of any updates.")
    else:
        logger.info(f"Invalid digits received: {Digits}, re-prompting")
        response.say("Invalid input. Please press 1 to acknowledge the incident.")
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
