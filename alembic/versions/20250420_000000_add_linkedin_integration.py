"""Add LinkedIn integration tables

Revision ID: 70c8e3a4d5b6
Revises: 6f32954b4f3c
Create Date: 2025-04-20 00:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '70c8e3a4d5b6'
down_revision = '6f32954b4f3c'
branch_labels = None
depends_on = None


def upgrade():
    # Create linkedin_accounts table
    op.create_table(
        'linkedin_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('linkedin_id', sa.String(length=255), nullable=False),
        sa.Column('access_token', sa.String(), nullable=False),
        sa.Column('refresh_token', sa.String(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('last_synced', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_linkedin_accounts_id'), 'linkedin_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_linkedin_accounts_user_id'), 'linkedin_accounts', ['user_id'], unique=True)

    # Create linkedin_connections table
    op.create_table(
        'linkedin_connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('linkedin_profile_id', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('position', sa.String(length=255), nullable=True),
        sa.Column('connection_degree', sa.SmallInteger(), nullable=False, default=1),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'linkedin_profile_id', name='uq_user_profile')
    )
    op.create_index(op.f('ix_linkedin_connections_id'), 'linkedin_connections', ['id'], unique=False)
    op.create_index(op.f('ix_linkedin_connections_user_id'), 'linkedin_connections', ['user_id'], unique=False)
    op.create_index(op.f('ix_linkedin_connections_linkedin_profile_id'), 'linkedin_connections', ['linkedin_profile_id'], unique=False)

    # Create brand_connections table
    op.create_table(
        'brand_connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('brand_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('first_degree_count', sa.Integer(), nullable=False, default=0),
        sa.Column('second_degree_count', sa.Integer(), nullable=False, default=0),
        sa.Column('last_updated', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'brand_id', name='uq_user_brand')
    )
    op.create_index(op.f('ix_brand_connections_id'), 'brand_connections', ['id'], unique=False)
    op.create_index(op.f('ix_brand_connections_user_id'), 'brand_connections', ['user_id'], unique=False)
    op.create_index(op.f('ix_brand_connections_brand_id'), 'brand_connections', ['brand_id'], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_table('brand_connections')
    op.drop_table('linkedin_connections')
    op.drop_table('linkedin_accounts')