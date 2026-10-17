-- Up Migration

CREATE TABLE session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    refresh_token TEXT,
    access_token TEXT,
    expiry TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER session_set_updated_at 
    BEFORE UPDATE ON session
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE session;