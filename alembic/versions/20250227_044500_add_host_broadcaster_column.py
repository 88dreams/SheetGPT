"""Add host_broadcaster column to stadiums table

Revision ID: add_host_broadcaster
Revises: 12cfdc5c6215
Create Date: 2025-02-27 04:45:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_host_broadcaster'
down_revision: Union[str, None] = '12cfdc5c6215'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add host_broadcaster column to stadiums table
    op.add_column('stadiums', sa.Column('host_broadcaster', sa.String(100), nullable=True))
    
    # Update host_broadcaster values based on broadcast_companies table
    op.execute("""
        UPDATE stadiums s
        SET host_broadcaster = bc.name
        FROM broadcast_companies bc
        WHERE s.host_broadcaster_id = bc.id
    """)


def downgrade() -> None:
    # Remove host_broadcaster column from stadiums table
    op.drop_column('stadiums', 'host_broadcaster') 