"""add_contacts_tables

Revision ID: 20250422_005144
Revises: 6f32954b4f3c
Create Date: 2025-04-22 00:51:44.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4

# revision identifiers, used by Alembic.
revision = '20250422_005144'
down_revision = '6f32954b4f3c'  # Update this to your most recent migration
branch_labels = None
depends_on = None


def upgrade():
    # Create contacts table
    op.create_table(
        'contacts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('linkedin_url', sa.String(255), nullable=True),
        sa.Column('company', sa.String(100), nullable=True),
        sa.Column('position', sa.String(100), nullable=True),
        sa.Column('connected_on', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes for contacts table
    op.create_index('ix_contacts_first_name', 'contacts', ['first_name'])
    op.create_index('ix_contacts_last_name', 'contacts', ['last_name'])
    op.create_index('ix_contacts_email', 'contacts', ['email'])
    op.create_index('ix_contacts_company', 'contacts', ['company'])
    op.create_index('ix_contacts_user_id', 'contacts', ['user_id'])

    # Create contact_brand_associations table
    op.create_table(
        'contact_brand_associations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid4),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id'), nullable=False),
        sa.Column('brand_id', UUID(as_uuid=True), sa.ForeignKey('brands.id'), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False, server_default=sa.text('1.0')),
        sa.Column('association_type', sa.String(50), nullable=False, server_default=sa.text("'employed_at'")),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('contact_id', 'brand_id', name='uq_contact_brand'),
    )

    # Create indexes for contact_brand_associations table
    op.create_index('ix_contact_brand_associations_contact_id', 'contact_brand_associations', ['contact_id'])
    op.create_index('ix_contact_brand_associations_brand_id', 'contact_brand_associations', ['brand_id'])


def downgrade():
    # Drop contact_brand_associations table
    op.drop_table('contact_brand_associations')
    
    # Drop contacts table
    op.drop_table('contacts')