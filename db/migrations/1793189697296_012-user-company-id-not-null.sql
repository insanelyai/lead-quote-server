-- Up Migration
ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;

-- Down Migration
ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;