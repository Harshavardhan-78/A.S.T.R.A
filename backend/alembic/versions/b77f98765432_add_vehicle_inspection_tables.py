"""add_vehicle_inspection_tables

Revision ID: b77f98765432
Revises: a83b92c41d10
Create Date: 2026-09-21 14:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b77f98765432'
down_revision: Union[str, Sequence[str], None] = 'a83b92c41d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vehicle_inspections',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('parking_assignment_id', sa.Integer(), nullable=True),
        sa.Column('stage', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('created_by_user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.ForeignKeyConstraint(['parking_assignment_id'], ['parking_assignments.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'inspection_images',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('view', sa.String(length=20), nullable=False),
        sa.Column('media_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['inspection_id'], ['vehicle_inspections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['media_id'], ['media.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'damage_detections',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('inspection_image_id', sa.Integer(), nullable=False),
        sa.Column('damage_type', sa.String(length=50), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('x1', sa.Float(), nullable=False),
        sa.Column('y1', sa.Float(), nullable=False),
        sa.Column('x2', sa.Float(), nullable=False),
        sa.Column('y2', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['inspection_image_id'], ['inspection_images.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('damage_detections')
    op.drop_table('inspection_images')
    op.drop_table('vehicle_inspections')
