-- Up Migration

CREATE TABLE lead_history (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id        UUID        NOT NULL,
    company_id     UUID        NOT NULL REFERENCES companies (id),
    previous_state TEXT,
    updated_state  TEXT        NOT NULL,
    updated_by     UUID        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lead_history_lead_id_created_at_idx ON lead_history (lead_id, created_at DESC);
CREATE INDEX lead_history_company_id_idx ON lead_history (company_id);
