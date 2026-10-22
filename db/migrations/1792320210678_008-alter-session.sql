-- Up Migration
ALTER TABLE session ADD COLUMN csrf_token TEXT;

-- Down Migration

ALTER TABLE session DROP COLUMN csrf_token;