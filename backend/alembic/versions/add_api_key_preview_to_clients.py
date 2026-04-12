"""Add api_key_preview column to clients

Revision ID: add_api_key_preview_to_clients
Revises: add_is_deleted_to_contacts
Create Date: 2026-04-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'add_api_key_preview_to_clients'
down_revision: Union[str, None] = 'add_is_deleted_to_contacts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('api_key_preview', sa.String(12), nullable=True))


def downgrade() -> None:
    op.drop_column('clients', 'api_key_preview')