"""Add missing fields to GameBroadcast and LeagueExecutive

Revision ID: 12cfdc5c6215
Revises: add_is_admin_field
Create Date: 2025-02-27 03:47:29.681890+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '12cfdc5c6215'
down_revision: Union[str, None] = 'add_is_admin_field'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    # Add start_time and end_time to game_broadcasts
    op.add_column('game_broadcasts', sa.Column('start_time', sa.String(50), nullable=True))
    op.add_column('game_broadcasts', sa.Column('end_time', sa.String(50), nullable=True))
    
    # Add end_date to league_executives
    op.add_column('league_executives', sa.Column('end_date', sa.Date(), nullable=True))
    
    # Rename title to position in league_executives
    op.alter_column('league_executives', 'title', new_column_name='position')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    # Revert position back to title in league_executives
    op.alter_column('league_executives', 'position', new_column_name='title')
    
    # Remove end_date from league_executives
    op.drop_column('league_executives', 'end_date')
    
    # Remove start_time and end_time from game_broadcasts
    op.drop_column('game_broadcasts', 'end_time')
    op.drop_column('game_broadcasts', 'start_time')
    # ### end Alembic commands ###