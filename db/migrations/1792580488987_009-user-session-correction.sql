-- Up Migration
ALTER TABLE users ALTER COLUMN session_id DROP NOT NULL;

UPDATE users SET session_id = NULL 
WHERE session_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM session s WHERE s.id = users.session_id);

ALTER TABLE users 
ADD CONSTRAINT users_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE SET NULL;

CREATE INDEX user_session_id_idx ON users (session_id);

-- Down Migration
DROP INDEX user_session_id_idx;
ALTER TABLE users DROP CONSTRAINT users_session_id_fkey;