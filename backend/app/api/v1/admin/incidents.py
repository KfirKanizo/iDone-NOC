from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.models import Client, Incident, IncidentLog, IncidentStatus, ActionType
from app.api.v1.admin.auth import get_current_admin

router = APIRouter(prefix="/incidents", tags=["admin-incidents"])


class IncidentResponse(BaseModel):
    id: str
    client_id: str
    policy_id: Optional[str]
    payload: dict
    status: str
    current_escalation_level: int
    current_retry_count: int
    acknowledged_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentLogResponse(BaseModel):
    id: str
    incident_id: str
    action_type: str
    details: dict
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    client_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    query = db.query(Incident)
    
    if client_id:
        query = query.filter(Incident.client_id == uuid.UUID(client_id))
    if status:
        query = query.filter(Incident.status == status)
    
    incidents = query.order_by(Incident.created_at.desc()).offset(offset).limit(limit).all()
    return incidents


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    incident = db.query(Incident).filter(Incident.id == uuid.UUID(incident_id)).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return IncidentResponse(
        id=str(incident.id),
        client_id=str(incident.client_id),
        policy_id=str(incident.policy_id) if incident.policy_id else None,
        payload=incident.payload,
        status=incident.status.value,
        current_escalation_level=incident.current_escalation_level,
        current_retry_count=incident.current_retry_count,
        acknowledged_by=str(incident.acknowledged_by) if incident.acknowledged_by else None,
        created_at=incident.created_at,
    )


@router.get("/{incident_id}/logs", response_model=List[IncidentLogResponse])
def get_incident_logs(
    incident_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    incident = db.query(Incident).filter(Incident.id == uuid.UUID(incident_id)).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    logs = db.query(IncidentLog).filter(
        IncidentLog.incident_id == uuid.UUID(incident_id)
    ).order_by(IncidentLog.created_at.asc()).all()
    
    return [
        IncidentLogResponse(
            id=str(log.id),
            incident_id=str(log.incident_id),
            action_type=log.action_type.value,
            details=log.details,
            created_at=log.created_at,
        )
        for log in logs
    ]
