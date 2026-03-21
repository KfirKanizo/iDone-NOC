"""Add is_deleted column to contacts and migrate existing data

Revision ID: add_is_deleted_to_contacts
Revises: add_language_to_contacts
Create Date: 2026-03-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'add_is_deleted_to_contacts'
down_revision: Union[str, None] = 'add_language_to_contacts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('contacts', sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='false'))
    
    op.execute("""
        UPDATE contacts 
        SET is_deleted = true 
        WHERE is_active = false
    """)


def downgrade() -> None:
    op.drop_column('contacts', 'is_deleted')
