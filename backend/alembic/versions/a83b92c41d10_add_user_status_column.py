"""add_user_status_column

Revision ID: a83b92c41d10
Revises: 7579d2e740c7
Create Date: 2026-09-12 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a83b92c41d10'
down_revision: Union[str, Sequence[str], None] = '7579d2e740c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'status')
