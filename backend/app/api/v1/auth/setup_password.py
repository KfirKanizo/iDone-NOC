from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.config import settings
from app.api.v1.admin.auth import create_access_token

router = APIRouter(tags=["auth"])


class SetupPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


class SetupPasswordResponse(BaseModel):
    access_token: str
    token_type: str


@router.post("/setup-password", response_model=SetupPasswordResponse)
def setup_password(
    request: SetupPasswordRequest,
    db: Session = Depends(get_db)
):
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    user = db.query(User).filter(
        User.invitation_token == request.token
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invitation token",
        )

    if not user.is_invitation_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation token has expired",
        )

    user.password_hash = User.hash_password(request.password)
    user.invitation_token = None
    user.invitation_expiry = None
    user.is_active = True
    db.commit()

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "client_id": str(user.client_id) if user.client_id else None
    }
    access_token = create_access_token(data=token_data)

    return SetupPasswordResponse(
        access_token=access_token,
        token_type="bearer"
    )