import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EscalationPolicy(Base):
    __tablename__ = "escalation_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    max_retries_per_level = Column(Integer, default=3, nullable=False)
    retry_delay_seconds = Column(Integer, default=60, nullable=False)
    tts_message_template = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="escalation_policies")
    incidents = relationship("Incident", back_populates="policy")

    level_0_contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    level_1_contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    level_2_contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    level_3_contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    level_4_contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    level_5_contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)

    level_0_contact = relationship("Contact", foreign_keys=[level_0_contact_id])
    level_1_contact = relationship("Contact", foreign_keys=[level_1_contact_id])
    level_2_contact = relationship("Contact", foreign_keys=[level_2_contact_id])
    level_3_contact = relationship("Contact", foreign_keys=[level_3_contact_id])
    level_4_contact = relationship("Contact", foreign_keys=[level_4_contact_id])
    level_5_contact = relationship("Contact", foreign_keys=[level_5_contact_id])

    def get_contact_for_level(self, level: int):
        if level < 0 or level > 5:
            return None
        level_contacts = [
            self.level_0_contact,
            self.level_1_contact,
            self.level_2_contact,
            self.level_3_contact,
            self.level_4_contact,
            self.level_5_contact,
        ]
        return level_contacts[level]
