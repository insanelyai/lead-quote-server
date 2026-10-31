-- Up Migration
ALTER TABLE users ADD COLUMN company_id UUID NOT NULL REFERENCES companies (id);

CREATE TYPE invitation_status AS ENUM ('PENDING', 'REJECTED');

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users (id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL, 
    role user_roles NOT NULL DEFAULT 'USER',
    token_hash TEXT NOT NULL UNIQUE,
    status invitation_status NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 Days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, email)
);

CREATE INDEX invitations_expires_at_idx ON invitations (expires_at);

-- Down Migration
ALTER TABLE users DROP COLUMN company_id;
DROP TABLE invitations;
DROP TYPE invitation_status;