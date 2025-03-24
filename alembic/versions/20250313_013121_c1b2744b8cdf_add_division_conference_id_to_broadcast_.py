"""add_division_conference_id_to_broadcast_rights

Revision ID: c1b2744b8cdf
Revises: 97f937ec8e07
Create Date: 2025-03-13 01:31:21.452119+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1b2744b8cdf'
down_revision: Union[str, None] = '97f937ec8e07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add division_conference_id column to broadcast_rights table
    op.add_column('broadcast_rights', sa.Column('division_conference_id', sa.UUID(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_broadcast_rights_division_conference_id',
        'broadcast_rights', 'divisions_conferences',
        ['division_conference_id'], ['id']
    )


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('fk_broadcast_rights_division_conference_id', 'broadcast_rights', type_='foreignkey')
    
    # Drop division_conference_id column
    op.drop_column('broadcast_rights', 'division_conference_id') 