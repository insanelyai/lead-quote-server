-- Up Migration

CREATE TYPE user_roles AS ENUM ('USER', 'ADMIN');

CREATE TYPE leads_status AS ENUM (
    'NEW',
    'CONTACTED',
    'FOLLOWUP',
    'QUALIFIED',
    'WON',
    'LOST'
);

CREATE TABLE users (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   TEXT         NOT NULL,
    role       user_roles   NOT NULL DEFAULT 'USER',
    session_id UUID         NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE leads (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID         NOT NULL,
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) NOT NULL,
    phone        TEXT,
    company_name VARCHAR(255) NOT NULL,
    assigned_to  UUID         NOT NULL,
    source       VARCHAR(255) NOT NULL,
    status       leads_status NOT NULL DEFAULT 'NEW',
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
