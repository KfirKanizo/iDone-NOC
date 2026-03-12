from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.database import get_db
from app.models import Client, Incident, EscalationPolicy, IncidentLog, ActionType, IncidentStatus, hash_api_key
from app.tasks.escalation_tasks import process_escalation_step

router = APIRouter(prefix="/incidents", tags=["incidents"])


class InboundIncidentPayload(BaseModel):
    policy_id: Optional[str] = None
    details: Optional[str] = "Alert"
    metadata: Optional[Dict[str, Any]] = {}


@router.post("/inbound")
def create_incident(
    payload: InboundIncidentPayload,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    api_key_hash = hash_api_key(x_api_key)
    client = db.query(Client).filter(
        Client.api_key_hash == api_key_hash,
        Client.is_active == True,
    ).first()
    
    if not client:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    policy = None
    if payload.policy_id:
        policy = db.query(EscalationPolicy).filter(
            EscalationPolicy.id == payload.policy_id,
            EscalationPolicy.client_id == client.id,
        ).first()
    
    if not policy:
        policy = db.query(EscalationPolicy).filter(
            EscalationPolicy.client_id == client.id,
            EscalationPolicy.is_active == True,
        ).first()
    
    if not policy:
        raise HTTPException(status_code=400, detail="No active escalation policy found for client")
    
    incident = Incident(
        client_id=client.id,
        policy_id=policy.id,
        payload={
            "details": payload.details,
            "metadata": payload.metadata,
        },
        status=IncidentStatus.OPEN,
        current_escalation_level=0,
        current_retry_count=0,
    )
    db.add(incident)
    db.flush()
    
    log_entry = IncidentLog(
        incident_id=incident.id,
        action_type=ActionType.INGESTED,
        details={
            "client_id": str(client.id),
            "policy_id": str(policy.id),
            "payload": incident.payload,
        },
    )
    db.add(log_entry)
    db.commit()
    
    process_escalation_step.delay(str(incident.id))
    
    return {
        "status": "accepted",
        "incident_id": str(incident.id),
        "message": "Incident created and escalation started",
    }
