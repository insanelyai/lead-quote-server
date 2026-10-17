-- Up Migration

CREATE TABLE quote_items (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id    UUID           NOT NULL REFERENCES quote (id) ON DELETE CASCADE,
    description VARCHAR,
    unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    quantity    INTEGER        NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX quote_items_quote_id_idx ON quote_items (quote_id);

CREATE TRIGGER quote_items_set_updated_at
    BEFORE UPDATE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
