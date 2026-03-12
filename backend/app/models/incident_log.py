import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB as PG_JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ActionType(str, enum.Enum):
    INGESTED = "INGESTED"
    EMAIL_SENT = "EMAIL_SENT"
    CALL_INITIATED = "CALL_INITIATED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    ESCALATED = "ESCALATED"
    MAX_RETRIES_REACHED = "MAX_RETRIES_REACHED"
    RESOLVED = "RESOLVED"


class IncidentLog(Base):
    __tablename__ = "incident_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(SQLEnum(ActionType), nullable=False)
    details = Column(PG_JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("Incident", back_populates="logs")
