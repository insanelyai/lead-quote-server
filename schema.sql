--
-- PostgreSQL database dump
--

\restrict 66hf8RWBkeBz77JhSXNjr2jj4WZMfdrifigwdzHBfxhhdiDv7k7kXMubWyQMbsf

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: leads_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.leads_status AS ENUM (
    'NEW',
    'CONTACTED',
    'FOLLOWUP',
    'QUALIFIED',
    'WON',
    'LOST'
);


--
-- Name: quote_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quote_status AS ENUM (
    'GENERATED',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED'
);


--
-- Name: user_roles; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_roles AS ENUM (
    'USER',
    'ADMIN'
);


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    phone text,
    address character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lead_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    company_id uuid NOT NULL,
    previous_state public.leads_status,
    updated_state public.leads_status NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone text,
    company_name character varying(255) NOT NULL,
    assigned_to uuid NOT NULL,
    source character varying(255) NOT NULL,
    status public.leads_status DEFAULT 'NEW'::public.leads_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pgmigrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid NOT NULL,
    company_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    quote_number text NOT NULL,
    status public.quote_status DEFAULT 'GENERATED'::public.quote_status NOT NULL,
    discount numeric(5,4) DEFAULT 0 NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    validity timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_discount_check CHECK (((discount >= (0)::numeric) AND (discount <= (1)::numeric))),
    CONSTRAINT quote_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT quote_total_check CHECK ((total >= (0)::numeric))
);


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    description character varying,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_items_quantity_check CHECK ((quantity >= 0)),
    CONSTRAINT quote_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password text NOT NULL,
    role public.user_roles DEFAULT 'USER'::public.user_roles NOT NULL,
    session_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: lead_history lead_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quote quote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote
    ADD CONSTRAINT quote_pkey PRIMARY KEY (id);


--
-- Name: quote quote_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote
    ADD CONSTRAINT quote_quote_number_key UNIQUE (quote_number);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: lead_history_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lead_history_company_id_idx ON public.lead_history USING btree (company_id);


--
-- Name: lead_history_lead_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lead_history_lead_id_created_at_idx ON public.lead_history USING btree (lead_id, created_at DESC);


--
-- Name: leads_assigned_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_assigned_to_idx ON public.leads USING btree (assigned_to);


--
-- Name: leads_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_company_id_idx ON public.leads USING btree (company_id);


--
-- Name: quote_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_company_id_idx ON public.quote USING btree (company_id);


--
-- Name: quote_items_quote_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_items_quote_id_idx ON public.quote_items USING btree (quote_id);


--
-- Name: quote_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_lead_id_idx ON public.quote USING btree (lead_id);


--
-- Name: companies companies_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER companies_set_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: leads leads_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: quote_items quote_items_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_items_set_updated_at BEFORE UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: quote quote_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_set_updated_at BEFORE UPDATE ON public.quote FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lead_history lead_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: lead_history lead_history_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: lead_history lead_history_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: leads leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: leads leads_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: quote quote_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote
    ADD CONSTRAINT quote_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: quote quote_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote
    ADD CONSTRAINT quote_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quote(id) ON DELETE CASCADE;


--
-- Name: quote quote_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote
    ADD CONSTRAINT quote_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 66hf8RWBkeBz77JhSXNjr2jj4WZMfdrifigwdzHBfxhhdiDv7k7kXMubWyQMbsf

