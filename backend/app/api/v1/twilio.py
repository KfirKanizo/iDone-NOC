from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from twilio import twiml

from app.database import get_db
from app.models import Incident, Contact, IncidentLog, ActionType, IncidentStatus

router = APIRouter(prefix="/twilio", tags=["twilio"])


@router.post("/callback")
def twilio_callback(
    incident_id: str = Query(...),
    digits: str = Query(None),
    call_sid: str = Query(None),
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).with_for_update().first()
    
    if not incident:
        response = twiml.TwiML()
        response.say("Incident not found. Goodbye.")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")
    
    response = twiml.TwiML()
    
    if incident.status != IncidentStatus.OPEN:
        response.say("This incident has already been acknowledged. Goodbye.")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")
    
    if digits == "1":
        incident.status = IncidentStatus.ACKNOWLEDGED
        
        log_entry = IncidentLog(
            incident_id=incident.id,
            action_type=ActionType.ACKNOWLEDGED,
            details={
                "call_sid": call_sid,
                "digits_pressed": digits,
                "method": "twilio_callback",
            },
        )
        db.add(log_entry)
        db.commit()
        
        response.say("Thank you. You have acknowledged this incident. We will notify you of any updates.")
        response.hangup()
    else:
        response.say("Invalid input. Please press 1 to acknowledge the incident.")
        response.redirect("/api/v1/twilio/callback?incident_id=" + incident_id)
    
    return Response(content=str(response), media_type="application/xml")


@router.post("/status")
def twilio_status(
    incident_id: str = Query(...),
    call_status: str = Query(None, alias="CallStatus"),
    db: Session = Depends(get_db),
):
    return {"status": "received", "call_status": call_status}
