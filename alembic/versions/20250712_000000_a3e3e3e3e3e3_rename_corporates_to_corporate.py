"""rename corporates table to corporate

Revision ID: a3e3e3e3e3e3
Revises: 349ba6524aa3
Create Date: 2025-07-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3e3e3e3e3e3'
down_revision: Union[str, None] = '349ba6524aa3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table('corporates', 'corporate')


def downgrade() -> None:
    op.rename_table('corporate', 'corporates') 