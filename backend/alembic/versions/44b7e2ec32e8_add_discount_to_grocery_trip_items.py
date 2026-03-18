"""add discount to grocery trip items

Revision ID: 44b7e2ec32e8
Revises:
Create Date: 2026-03-16 23:21:10.048807

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '44b7e2ec32e8'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop food_data table if it exists (may not exist on fresh DBs)
    conn = op.get_bind()
    if conn.dialect.has_table(conn, 'food_data'):
        op.drop_index('ix_food_data_canonical_name', table_name='food_data')
        op.drop_index('ix_food_data_category', table_name='food_data')
        op.drop_index('ix_food_data_display_name', table_name='food_data')
        op.drop_index('ix_food_data_display_name_de', table_name='food_data')
        op.drop_index('ix_food_data_fdc_id', table_name='food_data')
        op.drop_table('food_data')

    # Add discount column if not already present
    if conn.dialect.has_table(conn, 'grocery_trip_items'):
        columns = [c['name'] for c in sa.inspect(conn).get_columns('grocery_trip_items')]
        if 'discount' not in columns:
            op.add_column('grocery_trip_items', sa.Column('discount', sa.Float(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('grocery_trip_items', 'discount')
