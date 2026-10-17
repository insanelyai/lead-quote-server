-- Up Migration

CREATE TYPE quote_status AS ENUM (
    'GENERATED',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED'
);

CREATE TABLE quote (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by   UUID          NOT NULL,
    company_id   UUID          NOT NULL REFERENCES companies (id),
    lead_id      UUID          NOT NULL,
    quote_number TEXT          NOT NULL UNIQUE,
    status       quote_status  NOT NULL DEFAULT 'GENERATED',
    discount     NUMERIC(5, 4) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 1),
    subtotal     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    total        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    validity     TIMESTAMPTZ   NOT NULL DEFAULT now() + INTERVAL '30 days',
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX quote_company_id_idx ON quote (company_id);
CREATE INDEX quote_lead_id_idx ON quote (lead_id);

CREATE TRIGGER quote_set_updated_at
    BEFORE UPDATE ON quote
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
