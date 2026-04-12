from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
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


class ContactCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: str
    language: str = "en-US"


class ContactUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None


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
        Contact.client_id == current_user.client_id,
        Contact.is_deleted == False
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


@router.post("/contacts", response_model=ContactResponse)
def create_contact(
    contact_data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    contact = Contact(
        client_id=current_user.client_id,
        full_name=contact_data.full_name,
        email=contact_data.email,
        phone_number=contact_data.phone_number,
        language=contact_data.language,
        is_active=True,
        is_deleted=False,
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
        is_deleted=contact.is_deleted,
        language=contact.language,
    )


@router.put("/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    contact = db.query(Contact).filter(
        Contact.id == uuid.UUID(contact_id),
        Contact.client_id == current_user.client_id,
        Contact.is_deleted == False
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if contact_data.full_name is not None:
        contact.full_name = contact_data.full_name
    if contact_data.email is not None:
        contact.email = contact_data.email
    if contact_data.phone_number is not None:
        contact.phone_number = contact_data.phone_number
    if contact_data.language is not None:
        contact.language = contact_data.language
    if contact_data.is_active is not None:
        contact.is_active = contact_data.is_active

    db.commit()
    db.refresh(contact)

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


@router.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    contact = db.query(Contact).filter(
        Contact.id == uuid.UUID(contact_id),
        Contact.client_id == current_user.client_id,
        Contact.is_deleted == False
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.is_deleted = True
    contact.is_active = False
    db.commit()

    return {"message": "Contact deleted successfully"}
