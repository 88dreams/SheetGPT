-- Create the contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    linkedin_url VARCHAR(255),
    company VARCHAR(100),
    position VARCHAR(100),
    connected_on DATE,
    notes TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indices
CREATE INDEX IF NOT EXISTS ix_contacts_first_name ON contacts (first_name);
CREATE INDEX IF NOT EXISTS ix_contacts_last_name ON contacts (last_name);
CREATE INDEX IF NOT EXISTS ix_contacts_email ON contacts (email);
CREATE INDEX IF NOT EXISTS ix_contacts_company ON contacts (company);
CREATE INDEX IF NOT EXISTS ix_contacts_user_id ON contacts (user_id);

-- Create the contact_brand_associations table
CREATE TABLE IF NOT EXISTS contact_brand_associations (
    id UUID PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts(id),
    brand_id UUID NOT NULL REFERENCES brands(id),
    confidence_score FLOAT NOT NULL DEFAULT 1.0,
    association_type VARCHAR(50) NOT NULL DEFAULT 'employed_at',
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_contact_brand UNIQUE (contact_id, brand_id)
);

-- Create indices
CREATE INDEX IF NOT EXISTS ix_contact_brand_associations_contact_id ON contact_brand_associations (contact_id);
CREATE INDEX IF NOT EXISTS ix_contact_brand_associations_brand_id ON contact_brand_associations (brand_id);