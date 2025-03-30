from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic
revision = 'add_secondary_brand'  # Shortened name
down_revision = 'div_conf_nickname'
branch_labels = None
depends_on = None

def upgrade():
    # Check if column exists first
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = insp.get_columns('production_services')
    column_names = [column['name'] for column in columns]
    
    if 'secondary_brand_id' not in column_names:
        # Add secondary_brand_id column to production_services table
        op.add_column('production_services', sa.Column('secondary_brand_id', UUID(as_uuid=True), 
                      sa.ForeignKey('brands.id', name='fk_production_services_secondary_brand_id_brands'),
                      nullable=True))
        
        # Add index on the new column
        op.create_index(op.f('ix_production_services_secondary_brand_id'), 'production_services', ['secondary_brand_id'], unique=False)

def downgrade():
    # Drop index
    op.drop_index(op.f('ix_production_services_secondary_brand_id'), table_name='production_services')
    
    # Drop column
    op.drop_column('production_services', 'secondary_brand_id')
