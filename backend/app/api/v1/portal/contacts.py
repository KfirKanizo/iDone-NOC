from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models import Contact, User
from app.api.deps import get_current_client_user

router = APIRouter(tags=["portal-contacts"])


class ContactResponse(BaseModel):
    id: str
    client_id: str
    full_name: str
    email: str
    phone_number: str
    is_active: bool
    is_deleted: bool
    language: str

    class Config:
        from_attributes = True


@router.get("/contacts", response_model=List[ContactResponse])
def list_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    contacts = db.query(Contact).filter(
        Contact.client_id == current_user.client_id,
        Contact.is_deleted == False
    ).all()

    return [
        ContactResponse(
            id=str(c.id),
            client_id=str(c.client_id),
            full_name=c.full_name,
            email=c.email,
            phone_number=c.phone_number,
            is_active=c.is_active,
            is_deleted=c.is_deleted,
            language=c.language,
        ) for c in contacts
    ]


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    contact = db.query(Contact).filter(
        Contact.id == uuid.UUID(contact_id),
        Contact.client_id == current_user.client_id
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    return ContactResponse(
        id=str(contact.id),
        client_id=str(contact.client_id),
        full_name=contact.full_name,
        email=contact.email,
        phone_number=contact.phone_number,
        is_active=contact.is_active,
        is_deleted=contact.is_deleted,
        language=contact.language,
    )
