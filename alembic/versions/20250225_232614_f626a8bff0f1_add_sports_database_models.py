"""Add sports database models

Revision ID: f626a8bff0f1
Revises: dd72e89e735e
Create Date: 2025-02-25 23:26:14.184259+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f626a8bff0f1'
down_revision: Union[str, None] = 'dd72e89e735e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Note: The sports database tables were created directly in the database
    # using SQLAlchemy Core. This migration is a no-op but documents the tables
    # that were created:
    #
    # - leagues: Stores information about sports leagues
    # - stadiums: Stores information about sports stadiums
    # - teams: Stores information about sports teams
    # - players: Stores information about sports players
    # - games: Stores information about sports games
    # - team_records: Stores team performance records
    # - team_ownerships: Stores team ownership information
    # - broadcast_companies: Stores broadcast company information
    # - broadcast_rights: Stores broadcast rights information
    # - production_services: Stores production services information
    # - brand_relationships: Stores brand relationship information
    # - game_broadcasts: Stores game broadcast information
    pass


def downgrade() -> None:
    # Note: If these tables need to be removed, they should be dropped manually
    # or a new migration should be created to drop them.
    pass 