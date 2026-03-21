"""Add language column to contacts

Revision ID: add_language_to_contacts
Revises: 9bbf80db2055
Create Date: 2026-03-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'add_language_to_contacts'
down_revision: Union[str, None] = '9bbf80db2055'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('contacts', sa.Column('language', sa.String(length=10), nullable=True, server_default='en-US'))


def downgrade() -> None:
    op.drop_column('contacts', 'language')
