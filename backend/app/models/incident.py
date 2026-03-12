import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB as PG_JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    FAILED_ESCALATION = "FAILED_ESCALATION"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("escalation_policies.id", ondelete="SET NULL"), nullable=True)
    payload = Column(PG_JSONB, default={})
    status = Column(SQLEnum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False)
    current_escalation_level = Column(Integer, default=0, nullable=False)
    current_retry_count = Column(Integer, default=0, nullable=False)
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="incidents")
    policy = relationship("EscalationPolicy", back_populates="incidents")
    logs = relationship("IncidentLog", back_populates="incident", cascade="all, delete-orphan")
