import uuid
import enum
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import passlib.context

from app.database import Base


pwd_context = passlib.context.CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CLIENT = "client"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CLIENT)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True)
    is_active = Column(Boolean, default=True)
    invitation_token = Column(String(64), nullable=True)
    invitation_expiry = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="users")

    def verify_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return pwd_context.verify(password, self.password_hash)

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    def generate_invitation_token(self) -> str:
        token = secrets.token_urlsafe(32)
        self.invitation_token = token
        self.invitation_expiry = datetime.now(timezone.utc) + timedelta(days=7)
        return token

    def is_invitation_valid(self) -> bool:
        if not self.invitation_token or not self.invitation_expiry:
            return False
        return datetime.now(timezone.utc) < self.invitation_expiry
