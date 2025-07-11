"""add_division_conference_id_to_broadcast_rights

Revision ID: c1b2744b8cdf
Revises: 97f937ec8e07
Create Date: 2025-03-13 01:31:21.793036+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c1b2744b8cdf'
down_revision: Union[str, None] = '97f937ec8e07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    # op.add_column('broadcast_rights', sa.Column('division_conference_id', postgresql.UUID(as_uuid=True), nullable=True))
    # op.create_foreign_key(op.f('fk_broadcast_rights_division_conference_id_divisions_conferences'), 'broadcast_rights', 'divisions_conferences', ['division_conference_id'], ['id'])
    pass # Column and FK likely created by earlier f626a8bff0f1 and later cda6110c2531
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    # op.drop_constraint(op.f('fk_broadcast_rights_division_conference_id_divisions_conferences'), 'broadcast_rights', type_='foreignkey')
    # op.drop_column('broadcast_rights', 'division_conference_id')
    pass # Column and FK dropped by later cda6110c2531 (downgrade) and earlier f626a8bff0f1 (downgrade)
    # ### end Alembic commands ### 