"""add_sport_and_sponsor_to_player

Revision ID: f9cb9229eefe
Revises: 828c207417ed
Create Date: 2025-05-30 16:15:22.825601+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f9cb9229eefe'
down_revision: Union[str, None] = '828c207417ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands for adding sport and sponsor_id to players table ###
    op.add_column('players', sa.Column('sport', sa.String(length=100), nullable=True))
    op.add_column('players', sa.Column('sponsor_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index(op.f('ix_players_sport'), 'players', ['sport'], unique=False)
    op.create_index(op.f('ix_players_sponsor_id'), 'players', ['sponsor_id'], unique=False)
    op.create_foreign_key(
        'fk_players_sponsor_id_brands',
        'players', 'brands',
        ['sponsor_id'], ['id']
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands for reverting sport and sponsor_id from players table ###
    op.drop_constraint('fk_players_sponsor_id_brands', 'players', type_='foreignkey')
    op.drop_index(op.f('ix_players_sponsor_id'), table_name='players')
    op.drop_index(op.f('ix_players_sport'), table_name='players')
    op.drop_column('players', 'sponsor_id')
    op.drop_column('players', 'sport')
    # ### end Alembic commands ### 