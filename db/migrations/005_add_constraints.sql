-- Up Migration

-- leads
ALTER TABLE leads
    ADD CONSTRAINT leads_company_id_fkey  FOREIGN KEY (company_id)  REFERENCES companies (id),
    ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users (id);

CREATE INDEX leads_company_id_idx  ON leads (company_id);
CREATE INDEX leads_assigned_to_idx ON leads (assigned_to);

-- quote
ALTER TABLE quote
    ADD CONSTRAINT quote_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id),
    ADD CONSTRAINT quote_lead_id_fkey    FOREIGN KEY (lead_id)    REFERENCES leads (id);

-- lead_history
ALTER TABLE lead_history
    ADD CONSTRAINT lead_history_lead_id_fkey    FOREIGN KEY (lead_id)    REFERENCES leads (id),
    ADD CONSTRAINT lead_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users (id),
    ALTER COLUMN previous_state TYPE leads_status USING previous_state::leads_status,
    ALTER COLUMN updated_state  TYPE leads_status USING updated_state::leads_status;

-- updated_at triggers (function is created in 001)
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER leads_set_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS companies_set_updated_at ON companies;
CREATE TRIGGER companies_set_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
