"""add primary keys to restored tables

Revision ID: f65c9e88c6bf
Revises: 58e7409c6c41
Create Date: 2025-05-20 05:22:37.123456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f65c9e88c6bf'
down_revision: Union[str, None] = '58e7409c6c41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES_WITH_UUID_PK = [
    'leagues', 'divisions_conferences', 'stadiums', 'teams', 'players',
    'games', 'broadcast_rights', 'production_services', 'brands',
    'team_records', 'team_ownerships', 'league_executives', 'game_broadcasts',
    'contacts', 'contact_brand_associations', 'users', 'conversations',
    'messages', 'structured_data', 'data_columns', 'data_change_history'
]

def upgrade() -> None:
    for table_name in TABLES_WITH_UUID_PK:
        op.create_primary_key(f'pk_{table_name}', table_name, ['id'])


def downgrade() -> None:
    for table_name in reversed(TABLES_WITH_UUID_PK): # Drop in reverse order of creation
        op.drop_constraint(f'pk_{table_name}', table_name, type_='primary') 