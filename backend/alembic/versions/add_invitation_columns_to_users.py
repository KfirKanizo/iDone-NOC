"""Add invitation columns to users

Revision ID: add_invitation_columns_to_users
Revises: add_api_key_preview_to_clients
Create Date: 2026-04-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'add_invitation_columns_to_users'
down_revision: Union[str, None] = 'add_api_key_preview_to_clients'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('invitation_token', sa.String(64), nullable=True))
    op.add_column('users', sa.Column('invitation_expiry', sa.DateTime(timezone=True), nullable=True))
    op.alter_column('users', 'password_hash', nullable=True)


def downgrade() -> None:
    op.drop_column('users', 'invitation_expiry')
    op.drop_column('users', 'invitation_token')
    op.alter_column('users', 'password_hash', nullable=False)