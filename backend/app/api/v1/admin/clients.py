from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models import Client, Contact, EscalationPolicy, Incident, IncidentStatus, IncidentLog, ActionType, hash_api_key, generate_api_key
from app.api.v1.admin.auth import get_current_admin

router = APIRouter(prefix="/clients", tags=["admin-clients"])


class ClientCreate(BaseModel):
    company_name: str
    is_active: bool = True


class ClientResponse(BaseModel):
    id: str
    company_name: str
    api_key: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("", response_model=List[ClientResponse])
def list_clients(
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    clients = db.query(Client).all()
    return clients


@router.post("", response_model=ClientResponse)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    api_key = generate_api_key()
    client = Client(
        company_name=client_data.company_name,
        is_active=client_data.is_active,
    )
    client.set_api_key(api_key)
    db.add(client)
    db.commit()
    db.refresh(client)
    return ClientResponse(
        id=str(client.id),
        company_name=client.company_name,
        api_key=api_key,
        is_active=client.is_active,
    )


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == uuid.UUID(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return ClientResponse(
        id=str(client.id),
        company_name=client.company_name,
        is_active=client.is_active,
    )


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == uuid.UUID(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client_data.company_name is not None:
        client.company_name = client_data.company_name
    if client_data.is_active is not None:
        client.is_active = client_data.is_active
    
    db.commit()
    db.refresh(client)
    return ClientResponse(
        id=str(client.id),
        company_name=client.company_name,
        is_active=client.is_active,
    )


@router.delete("/{client_id}")
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == uuid.UUID(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client.is_active = False
    db.commit()
    return {"message": "Client deactivated"}


@router.post("/{client_id}/regenerate-key", response_model=ClientResponse)
def regenerate_api_key(
    client_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == uuid.UUID(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    api_key = generate_api_key()
    client.set_api_key(api_key)
    db.commit()
    db.refresh(client)
    return ClientResponse(
        id=str(client.id),
        company_name=client.company_name,
        api_key=api_key,
        is_active=client.is_active,
    )
