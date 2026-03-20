"""add households

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Create households table
    if not conn.dialect.has_table(conn, 'households'):
        op.create_table(
            'households',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('invite_code', sa.String(32), unique=True, nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # Create household_members table
    if not conn.dialect.has_table(conn, 'household_members'):
        op.create_table(
            'household_members',
            sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
            sa.Column('user_id', sa.String(128), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('household_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('households.id', ondelete='CASCADE'), nullable=False),
            sa.Column('role', sa.String(20), default='member'),
            sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint('user_id', 'household_id'),
        )

    # Add household_id to food_items
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='food_items' AND column_name='household_id'"
    ))
    if result.fetchone() is None:
        op.add_column('food_items', sa.Column(
            'household_id', postgresql.UUID(as_uuid=True),
            sa.ForeignKey('households.id', ondelete='CASCADE'),
            nullable=True,
        ))


def downgrade() -> None:
    op.drop_column('food_items', 'household_id')
    op.drop_table('household_members')
    op.drop_table('households')
