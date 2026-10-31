-- Up Migration
ALTER TABLE users ADD COLUMN name VARCHAR(255) NOT NULL;
CREATE INDEX users_company_id_idx ON users (company_id);

-- Down Migration
DROP INDEX users_company_id_idx;
ALTER TABLE users DROP COLUMN name;
