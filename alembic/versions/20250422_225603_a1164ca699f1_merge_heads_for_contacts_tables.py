"""merge_heads_for_contacts_tables

Revision ID: a1164ca699f1
Revises: 170ace92fdc0, 20250422_005144
Create Date: 2025-04-22 22:56:03.296714+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1164ca699f1'
down_revision: Union[str, None] = ('170ace92fdc0', '20250422_005144')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 