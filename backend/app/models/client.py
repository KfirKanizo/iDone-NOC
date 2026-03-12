import uuid
import secrets
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import hashlib
import enum

from app.database import Base


def generate_api_key():
    return secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), nullable=False)
    api_key_hash = Column(String(64), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    contacts = relationship("Contact", back_populates="client", cascade="all, delete-orphan")
    escalation_policies = relationship("EscalationPolicy", back_populates="client", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="client", cascade="all, delete-orphan")

    _api_key = None

    def set_api_key(self, api_key: str):
        self._api_key = api_key
        self.api_key_hash = hash_api_key(api_key)

    def get_api_key(self):
        return self._api_key

    def verify_api_key(self, api_key: str) -> bool:
        return self.api_key_hash == hash_api_key(api_key)
