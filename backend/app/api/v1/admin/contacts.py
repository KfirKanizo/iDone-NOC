from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models import Client, Contact, EscalationPolicy
from app.api.v1.admin.auth import get_current_admin

router = APIRouter(prefix="/contacts", tags=["admin-contacts"])


class ContactCreate(BaseModel):
    client_id: str
    full_name: str
    email: str
    phone_number: str
    is_active: bool = True
    language: str = "en-US"


class ContactResponse(BaseModel):
    id: str
    client_id: str
    full_name: str
    email: str
    phone_number: str
    is_active: bool
    language: str

    class Config:
        from_attributes = True


class ContactUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    language: Optional[str] = None


@router.get("", response_model=List[ContactResponse])
def list_contacts(
    client_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    query = db.query(Contact)
    if client_id:
        query = query.filter(Contact.client_id == uuid.UUID(client_id))
    contacts = query.all()
    return [
        ContactResponse(
            id=str(c.id),
            client_id=str(c.client_id),
            full_name=c.full_name,
            email=c.email,
            phone_number=c.phone_number,
            is_active=c.is_active,
            language=c.language,
        ) for c in contacts
    ]


@router.post("", response_model=ContactResponse)
def create_contact(
    contact_data: ContactCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == uuid.UUID(contact_data.client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    contact = Contact(
        client_id=uuid.UUID(contact_data.client_id),
        full_name=contact_data.full_name,
        email=contact_data.email,
        phone_number=contact_data.phone_number,
        is_active=contact_data.is_active,
        language=contact_data.language,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return ContactResponse(
        id=str(contact.id),
        client_id=str(contact.client_id),
        full_name=contact.full_name,
        email=contact.email,
        phone_number=contact.phone_number,
        is_active=contact.is_active,
        language=contact.language,
    )


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    contact = db.query(Contact).filter(Contact.id == uuid.UUID(contact_id)).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse(
        id=str(contact.id),
        client_id=str(contact.client_id),
        full_name=contact.full_name,
        email=contact.email,
        phone_number=contact.phone_number,
        is_active=contact.is_active,
        language=contact.language,
    )


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    contact = db.query(Contact).filter(Contact.id == uuid.UUID(contact_id)).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    if contact_data.full_name is not None:
        contact.full_name = contact_data.full_name
    if contact_data.email is not None:
        contact.email = contact_data.email
    if contact_data.phone_number is not None:
        contact.phone_number = contact_data.phone_number
    if contact_data.is_active is not None:
        contact.is_active = contact_data.is_active
    if contact_data.language is not None:
        contact.language = contact_data.language
    
    db.commit()
    db.refresh(contact)
    return ContactResponse(
        id=str(contact.id),
        client_id=str(contact.client_id),
        full_name=contact.full_name,
        email=contact.email,
        phone_number=contact.phone_number,
        is_active=contact.is_active,
        language=contact.language,
    )


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    contact = db.query(Contact).filter(Contact.id == uuid.UUID(contact_id)).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact_uuid = uuid.UUID(contact_id)
    linked_policies = db.query(EscalationPolicy).filter(
        or_(
            EscalationPolicy.level_0_contact_id == contact_uuid,
            EscalationPolicy.level_1_contact_id == contact_uuid,
            EscalationPolicy.level_2_contact_id == contact_uuid,
            EscalationPolicy.level_3_contact_id == contact_uuid,
            EscalationPolicy.level_4_contact_id == contact_uuid,
            EscalationPolicy.level_5_contact_id == contact_uuid,
        )
    ).all()
    
    if linked_policies:
        policy_names = ", ".join([p.name for p in linked_policies])
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete contact because it is assigned to escalation policy: {policy_names}. Please remove this contact from the policy first."
        )
    
    contact.is_active = False
    db.commit()
    return {"message": "Contact deactivated"}
