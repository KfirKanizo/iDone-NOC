from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models import Client, Incident, EscalationPolicy, IncidentLog, IncidentStatus, ActionType
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
    time_range: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    query = db.query(Incident)
    
    if time_range is not None:
        now = datetime.utcnow()
        if time_range == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == "last_7_days":
            start_date = now - timedelta(days=7)
        elif time_range == "last_30_days":
            start_date = now - timedelta(days=30)
        else:
            start_date = None
        
        if start_date is not None:
            query = query.filter(Incident.created_at >= start_date)
    
    if client_id:
        query = query.filter(Incident.client_id == uuid.UUID(client_id))
    if status:
        query = query.filter(Incident.status == status)
    
    incidents = query.order_by(Incident.created_at.desc()).offset(offset).limit(limit).all()
    return [
        IncidentResponse(
            id=str(i.id),
            client_id=str(i.client_id),
            policy_id=str(i.policy_id) if i.policy_id else None,
            payload=i.payload,
            status=i.status.value,
            current_escalation_level=i.current_escalation_level,
            current_retry_count=i.current_retry_count,
            acknowledged_by=str(i.acknowledged_by) if i.acknowledged_by else None,
            created_at=i.created_at,
        ) for i in incidents
    ]


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


class CreateIncidentRequest(BaseModel):
    client_id: str
    details: str = "Alert"
    policy_id: Optional[str] = None


@router.post("", response_model=IncidentResponse)
def create_incident_admin(
    request: CreateIncidentRequest,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == uuid.UUID(request.client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    policy = None
    if request.policy_id:
        policy = db.query(EscalationPolicy).filter(
            EscalationPolicy.id == uuid.UUID(request.policy_id),
            EscalationPolicy.client_id == client.id,
        ).first()
    
    if not policy:
        policy = db.query(EscalationPolicy).filter(
            EscalationPolicy.client_id == client.id,
            EscalationPolicy.is_active == True,
        ).first()
    
    if not policy:
        raise HTTPException(status_code=400, detail="Client has no active escalation policy")
    
    incident = Incident(
        client_id=client.id,
        policy_id=policy.id,
        payload={"details": request.details},
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
            "source": "manual_dashboard",
            "payload": incident.payload,
        },
    )
    db.add(log_entry)
    db.commit()
    db.refresh(incident)
    
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


@router.post("/{incident_id}/acknowledge", response_model=IncidentResponse)
def acknowledge_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    incident = db.query(Incident).filter(Incident.id == uuid.UUID(incident_id)).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if incident.status == IncidentStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Cannot acknowledge a resolved incident")
    
    if incident.status == IncidentStatus.ACKNOWLEDGED:
        raise HTTPException(status_code=400, detail="Incident is already acknowledged")
    
    incident.status = IncidentStatus.ACKNOWLEDGED
    
    log_entry = IncidentLog(
        incident_id=incident.id,
        action_type=ActionType.ACKNOWLEDGED,
        details={"method": "manual_dashboard", "message": "Manually acknowledged via dashboard"},
    )
    db.add(log_entry)
    db.commit()
    db.refresh(incident)
    
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


@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
def resolve_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    incident = db.query(Incident).filter(Incident.id == uuid.UUID(incident_id)).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if incident.status == IncidentStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Incident is already resolved")
    
    incident.status = IncidentStatus.RESOLVED
    
    log_entry = IncidentLog(
        incident_id=incident.id,
        action_type=ActionType.RESOLVED,
        details={"method": "manual_dashboard", "message": "Manually resolved via dashboard"},
    )
    db.add(log_entry)
    db.commit()
    db.refresh(incident)
    
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
