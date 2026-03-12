from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models import Client, Contact, EscalationPolicy
from app.api.v1.admin.auth import get_current_admin

router = APIRouter(prefix="/policies", tags=["admin-policies"])


class PolicyCreate(BaseModel):
    client_id: str
    name: str
    max_retries_per_level: int = 3
    retry_delay_seconds: int = 60
    tts_message_template: str
    level_0_contact_id: Optional[str] = None
    level_1_contact_id: Optional[str] = None
    level_2_contact_id: Optional[str] = None
    level_3_contact_id: Optional[str] = None
    level_4_contact_id: Optional[str] = None
    level_5_contact_id: Optional[str] = None
    is_active: bool = True


class PolicyResponse(BaseModel):
    id: str
    client_id: str
    name: str
    max_retries_per_level: int
    retry_delay_seconds: int
    tts_message_template: str
    level_0_contact_id: Optional[str] = None
    level_1_contact_id: Optional[str] = None
    level_2_contact_id: Optional[str] = None
    level_3_contact_id: Optional[str] = None
    level_4_contact_id: Optional[str] = None
    level_5_contact_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    max_retries_per_level: Optional[int] = None
    retry_delay_seconds: Optional[int] = None
    tts_message_template: Optional[str] = None
    level_0_contact_id: Optional[str] = None
    level_1_contact_id: Optional[str] = None
    level_2_contact_id: Optional[str] = None
    level_3_contact_id: Optional[str] = None
    level_4_contact_id: Optional[str] = None
    level_5_contact_id: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("", response_model=List[PolicyResponse])
def list_policies(
    client_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    query = db.query(EscalationPolicy)
    if client_id:
        query = query.filter(EscalationPolicy.client_id == uuid.UUID(client_id))
    policies = query.all()
    return [
        PolicyResponse(
            id=str(p.id),
            client_id=str(p.client_id),
            name=p.name,
            max_retries_per_level=p.max_retries_per_level,
            retry_delay_seconds=p.retry_delay_seconds,
            tts_message_template=p.tts_message_template,
            level_0_contact_id=str(p.level_0_contact_id) if p.level_0_contact_id else None,
            level_1_contact_id=str(p.level_1_contact_id) if p.level_1_contact_id else None,
            level_2_contact_id=str(p.level_2_contact_id) if p.level_2_contact_id else None,
            level_3_contact_id=str(p.level_3_contact_id) if p.level_3_contact_id else None,
            level_4_contact_id=str(p.level_4_contact_id) if p.level_4_contact_id else None,
            level_5_contact_id=str(p.level_5_contact_id) if p.level_5_contact_id else None,
            is_active=p.is_active,
        ) for p in policies
    ]


@router.post("", response_model=PolicyResponse)
def create_policy(
    policy_data: PolicyCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == uuid.UUID(policy_data.client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    policy = EscalationPolicy(
        client_id=uuid.UUID(policy_data.client_id),
        name=policy_data.name,
        max_retries_per_level=policy_data.max_retries_per_level,
        retry_delay_seconds=policy_data.retry_delay_seconds,
        tts_message_template=policy_data.tts_message_template,
        level_0_contact_id=uuid.UUID(policy_data.level_0_contact_id) if policy_data.level_0_contact_id else None,
        level_1_contact_id=uuid.UUID(policy_data.level_1_contact_id) if policy_data.level_1_contact_id else None,
        level_2_contact_id=uuid.UUID(policy_data.level_2_contact_id) if policy_data.level_2_contact_id else None,
        level_3_contact_id=uuid.UUID(policy_data.level_3_contact_id) if policy_data.level_3_contact_id else None,
        level_4_contact_id=uuid.UUID(policy_data.level_4_contact_id) if policy_data.level_4_contact_id else None,
        level_5_contact_id=uuid.UUID(policy_data.level_5_contact_id) if policy_data.level_5_contact_id else None,
        is_active=policy_data.is_active,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return PolicyResponse(
        id=str(policy.id),
        client_id=str(policy.client_id),
        name=policy.name,
        max_retries_per_level=policy.max_retries_per_level,
        retry_delay_seconds=policy.retry_delay_seconds,
        tts_message_template=policy.tts_message_template,
        level_0_contact_id=str(policy.level_0_contact_id) if policy.level_0_contact_id else None,
        level_1_contact_id=str(policy.level_1_contact_id) if policy.level_1_contact_id else None,
        level_2_contact_id=str(policy.level_2_contact_id) if policy.level_2_contact_id else None,
        level_3_contact_id=str(policy.level_3_contact_id) if policy.level_3_contact_id else None,
        level_4_contact_id=str(policy.level_4_contact_id) if policy.level_4_contact_id else None,
        level_5_contact_id=str(policy.level_5_contact_id) if policy.level_5_contact_id else None,
        is_active=policy.is_active,
    )


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    policy = db.query(EscalationPolicy).filter(EscalationPolicy.id == uuid.UUID(policy_id)).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return PolicyResponse(
        id=str(policy.id),
        client_id=str(policy.client_id),
        name=policy.name,
        max_retries_per_level=policy.max_retries_per_level,
        retry_delay_seconds=policy.retry_delay_seconds,
        tts_message_template=policy.tts_message_template,
        level_0_contact_id=str(policy.level_0_contact_id) if policy.level_0_contact_id else None,
        level_1_contact_id=str(policy.level_1_contact_id) if policy.level_1_contact_id else None,
        level_2_contact_id=str(policy.level_2_contact_id) if policy.level_2_contact_id else None,
        level_3_contact_id=str(policy.level_3_contact_id) if policy.level_3_contact_id else None,
        level_4_contact_id=str(policy.level_4_contact_id) if policy.level_4_contact_id else None,
        level_5_contact_id=str(policy.level_5_contact_id) if policy.level_5_contact_id else None,
        is_active=policy.is_active,
    )


@router.put("/{policy_id}", response_model=PolicyResponse)
def update_policy(
    policy_id: str,
    policy_data: PolicyUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    policy = db.query(EscalationPolicy).filter(EscalationPolicy.id == uuid.UUID(policy_id)).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    if policy_data.name is not None:
        policy.name = policy_data.name
    if policy_data.max_retries_per_level is not None:
        policy.max_retries_per_level = policy_data.max_retries_per_level
    if policy_data.retry_delay_seconds is not None:
        policy.retry_delay_seconds = policy_data.retry_delay_seconds
    if policy_data.tts_message_template is not None:
        policy.tts_message_template = policy_data.tts_message_template
    if policy_data.level_0_contact_id is not None:
        policy.level_0_contact_id = uuid.UUID(policy_data.level_0_contact_id) if policy_data.level_0_contact_id else None
    if policy_data.level_1_contact_id is not None:
        policy.level_1_contact_id = uuid.UUID(policy_data.level_1_contact_id) if policy_data.level_1_contact_id else None
    if policy_data.level_2_contact_id is not None:
        policy.level_2_contact_id = uuid.UUID(policy_data.level_2_contact_id) if policy_data.level_2_contact_id else None
    if policy_data.level_3_contact_id is not None:
        policy.level_3_contact_id = uuid.UUID(policy_data.level_3_contact_id) if policy_data.level_3_contact_id else None
    if policy_data.level_4_contact_id is not None:
        policy.level_4_contact_id = uuid.UUID(policy_data.level_4_contact_id) if policy_data.level_4_contact_id else None
    if policy_data.level_5_contact_id is not None:
        policy.level_5_contact_id = uuid.UUID(policy_data.level_5_contact_id) if policy_data.level_5_contact_id else None
    if policy_data.is_active is not None:
        policy.is_active = policy_data.is_active
    
    db.commit()
    db.refresh(policy)
    return PolicyResponse(
        id=str(policy.id),
        client_id=str(policy.client_id),
        name=policy.name,
        max_retries_per_level=policy.max_retries_per_level,
        retry_delay_seconds=policy.retry_delay_seconds,
        tts_message_template=policy.tts_message_template,
        level_0_contact_id=str(policy.level_0_contact_id) if policy.level_0_contact_id else None,
        level_1_contact_id=str(policy.level_1_contact_id) if policy.level_1_contact_id else None,
        level_2_contact_id=str(policy.level_2_contact_id) if policy.level_2_contact_id else None,
        level_3_contact_id=str(policy.level_3_contact_id) if policy.level_3_contact_id else None,
        level_4_contact_id=str(policy.level_4_contact_id) if policy.level_4_contact_id else None,
        level_5_contact_id=str(policy.level_5_contact_id) if policy.level_5_contact_id else None,
        is_active=policy.is_active,
    )


@router.delete("/{policy_id}")
def delete_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    policy = db.query(EscalationPolicy).filter(EscalationPolicy.id == uuid.UUID(policy_id)).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    policy.is_active = False
    db.commit()
    return {"message": "Policy deactivated"}
