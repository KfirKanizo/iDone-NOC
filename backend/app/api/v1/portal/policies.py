from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models import EscalationPolicy, User
from app.api.deps import get_current_client_user

router = APIRouter(tags=["portal-policies"])


class PolicyContactSimple(BaseModel):
    id: str
    full_name: str
    email: str

    class Config:
        from_attributes = True


class PolicyResponse(BaseModel):
    id: str
    client_id: str
    name: str
    max_retries_per_level: int
    retry_delay_seconds: int
    tts_message_template: str
    is_active: bool
    level_0_contact: Optional[PolicyContactSimple] = None
    level_1_contact: Optional[PolicyContactSimple] = None
    level_2_contact: Optional[PolicyContactSimple] = None
    level_3_contact: Optional[PolicyContactSimple] = None
    level_4_contact: Optional[PolicyContactSimple] = None
    level_5_contact: Optional[PolicyContactSimple] = None

    class Config:
        from_attributes = True


def contact_to_simple(contact) -> Optional[PolicyContactSimple]:
    if contact is None:
        return None
    return PolicyContactSimple(
        id=str(contact.id),
        full_name=contact.full_name,
        email=contact.email,
    )


@router.get("/policies", response_model=List[PolicyResponse])
def list_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    policies = db.query(EscalationPolicy).filter(
        EscalationPolicy.client_id == current_user.client_id,
        EscalationPolicy.is_active == True
    ).all()

    return [
        PolicyResponse(
            id=str(p.id),
            client_id=str(p.client_id),
            name=p.name,
            max_retries_per_level=p.max_retries_per_level,
            retry_delay_seconds=p.retry_delay_seconds,
            tts_message_template=p.tts_message_template,
            is_active=p.is_active,
            level_0_contact=contact_to_simple(p.level_0_contact),
            level_1_contact=contact_to_simple(p.level_1_contact),
            level_2_contact=contact_to_simple(p.level_2_contact),
            level_3_contact=contact_to_simple(p.level_3_contact),
            level_4_contact=contact_to_simple(p.level_4_contact),
            level_5_contact=contact_to_simple(p.level_5_contact),
        ) for p in policies
    ]


@router.get("/policies/{policy_id}", response_model=PolicyResponse)
def get_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    policy = db.query(EscalationPolicy).filter(
        EscalationPolicy.id == uuid.UUID(policy_id),
        EscalationPolicy.client_id == current_user.client_id,
        EscalationPolicy.is_active == True
    ).first()

    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return PolicyResponse(
        id=str(policy.id),
        client_id=str(policy.client_id),
        name=policy.name,
        max_retries_per_level=policy.max_retries_per_level,
        retry_delay_seconds=policy.retry_delay_seconds,
        tts_message_template=policy.tts_message_template,
        is_active=policy.is_active,
        level_0_contact=contact_to_simple(policy.level_0_contact),
        level_1_contact=contact_to_simple(policy.level_1_contact),
        level_2_contact=contact_to_simple(policy.level_2_contact),
        level_3_contact=contact_to_simple(policy.level_3_contact),
        level_4_contact=contact_to_simple(policy.level_4_contact),
        level_5_contact=contact_to_simple(policy.level_5_contact),
    )