"""make_division_conference_required

Revision ID: 97f937ec8e07
Revises: eaf52ec12ce4
Create Date: 2025-03-13 00:54:24.633889+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '97f937ec8e07'
down_revision: Union[str, None] = 'eaf52ec12ce4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Note: In a real production environment, you would need to run a script 
    # to assign divisions/conferences to all existing teams before making this NOT NULL
    op.alter_column('teams', 'division_conference_id',
                    existing_type=sa.dialects.postgresql.UUID(),
                    nullable=False)


def downgrade() -> None:
    op.alter_column('teams', 'division_conference_id',
                    existing_type=sa.dialects.postgresql.UUID(),
                    nullable=True) 