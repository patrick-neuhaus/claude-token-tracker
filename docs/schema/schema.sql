--
-- PostgreSQL database dump
--

\restrict rgU1b1qUsAK7jEjOEMfx01RxXl3JoqGFJYYHMGxRl8YUeV9mhbNMilidIUYAJ3e

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migrations (
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: compactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    project_id uuid,
    before_tokens bigint,
    after_tokens bigint,
    reduction_pct numeric(5,2),
    trigger text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT compactions_trigger_check CHECK ((trigger = ANY (ARRAY['auto'::text, 'manual'::text])))
);


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_resets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    custom_name text,
    source text NOT NULL,
    first_seen timestamp with time zone NOT NULL,
    last_seen timestamp with time zone NOT NULL,
    total_cost_usd numeric(12,6) DEFAULT 0,
    total_input bigint DEFAULT 0,
    total_output bigint DEFAULT 0,
    entry_count integer DEFAULT 0,
    project_id uuid,
    session_name text
);


--
-- Name: skill_allowlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_allowlist (
    skill_name text NOT NULL,
    status text NOT NULL,
    notes text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT skill_allowlist_status_check CHECK ((status = ANY (ARRAY['active'::text, 'deprecated'::text])))
);


--
-- Name: skill_invocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_invocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    skill_name text NOT NULL,
    source text DEFAULT 'claude-code'::text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    session_id text,
    decision text NOT NULL,
    project_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT skill_invocations_decision_check CHECK ((decision = ANY (ARRAY['allow'::text, 'deny'::text, 'ask'::text])))
);


--
-- Name: token_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    source text NOT NULL,
    model text NOT NULL,
    input_tokens bigint DEFAULT 0 NOT NULL,
    output_tokens bigint DEFAULT 0 NOT NULL,
    cache_read bigint DEFAULT 0 NOT NULL,
    cache_write bigint DEFAULT 0 NOT NULL,
    total_tokens bigint DEFAULT 0 NOT NULL,
    cost_usd numeric(12,6) DEFAULT 0 NOT NULL,
    session_id text,
    conversation_url text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT token_entries_source_check CHECK ((source = ANY (ARRAY['claude-code'::text, 'claude.ai'::text, 'codex'::text])))
);


--
-- Name: tool_invocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tool_invocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text,
    project_id uuid,
    tool_name text NOT NULL,
    duration_ms integer,
    success boolean DEFAULT true,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_pricing_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_pricing_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    model_key text NOT NULL,
    input_rate numeric(10,4) NOT NULL,
    output_rate numeric(10,4) NOT NULL,
    cache_read_rate numeric(10,4) NOT NULL,
    cache_write_rate numeric(10,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_pricing_overrides_cache_read_rate_check CHECK ((cache_read_rate >= (0)::numeric)),
    CONSTRAINT user_pricing_overrides_cache_write_rate_check CHECK ((cache_write_rate >= (0)::numeric)),
    CONSTRAINT user_pricing_overrides_input_rate_check CHECK ((input_rate >= (0)::numeric)),
    CONSTRAINT user_pricing_overrides_output_rate_check CHECK ((output_rate >= (0)::numeric))
);


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'pending'::text NOT NULL,
    brl_rate numeric(6,2) DEFAULT 5.50 NOT NULL,
    plan_cost_usd numeric(8,2) DEFAULT 200.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    daily_budget_usd numeric(10,4),
    session_budget_usd numeric(10,4),
    plan_start_date date,
    weekly_reset_dow integer DEFAULT 2,
    weekly_reset_hour integer DEFAULT 15,
    onboarding_completed boolean DEFAULT false NOT NULL,
    onboarding_completed_at timestamp with time zone,
    CONSTRAINT user_settings_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'user'::text, 'pending'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    display_name text,
    webhook_token uuid DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    webhook_token_hash character(64),
    webhook_token_rotated_at timestamp with time zone
);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (name);


--
-- Name: compactions compactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compactions
    ADD CONSTRAINT compactions_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_token_key UNIQUE (token);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_user_id_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_session_id_key UNIQUE (user_id, session_id);


--
-- Name: skill_allowlist skill_allowlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_allowlist
    ADD CONSTRAINT skill_allowlist_pkey PRIMARY KEY (skill_name);


--
-- Name: skill_invocations skill_invocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_invocations
    ADD CONSTRAINT skill_invocations_pkey PRIMARY KEY (id);


--
-- Name: token_entries token_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_entries
    ADD CONSTRAINT token_entries_pkey PRIMARY KEY (id);


--
-- Name: tool_invocations tool_invocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_invocations
    ADD CONSTRAINT tool_invocations_pkey PRIMARY KEY (id);


--
-- Name: user_pricing_overrides user_pricing_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pricing_overrides
    ADD CONSTRAINT user_pricing_overrides_pkey PRIMARY KEY (id);


--
-- Name: user_pricing_overrides user_pricing_overrides_user_id_model_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pricing_overrides
    ADD CONSTRAINT user_pricing_overrides_user_id_model_key_key UNIQUE (user_id, model_key);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


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
-- Name: users users_webhook_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_webhook_token_unique UNIQUE (webhook_token);


--
-- Name: idx_compactions_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compactions_session ON public.compactions USING btree (session_id);


--
-- Name: idx_compactions_user_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compactions_user_timestamp ON public.compactions USING btree (user_id, "timestamp" DESC);


--
-- Name: idx_password_resets_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_resets_expires ON public.password_resets USING btree (expires_at);


--
-- Name: idx_password_resets_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_resets_token ON public.password_resets USING btree (token);


--
-- Name: idx_password_resets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_resets_user ON public.password_resets USING btree (user_id);


--
-- Name: idx_projects_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id);


--
-- Name: idx_sessions_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_last_seen ON public.sessions USING btree (last_seen DESC);


--
-- Name: idx_sessions_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_project_id ON public.sessions USING btree (project_id);


--
-- Name: idx_skill_invocations_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_invocations_decision ON public.skill_invocations USING btree (decision);


--
-- Name: idx_skill_invocations_skill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_invocations_skill ON public.skill_invocations USING btree (skill_name);


--
-- Name: idx_skill_invocations_user_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_invocations_user_ts ON public.skill_invocations USING btree (user_id, "timestamp" DESC);


--
-- Name: idx_token_entries_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_entries_model ON public.token_entries USING btree (model);


--
-- Name: idx_token_entries_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_entries_session ON public.token_entries USING btree (session_id);


--
-- Name: idx_token_entries_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_entries_source ON public.token_entries USING btree (source);


--
-- Name: idx_token_entries_user_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_entries_user_ts ON public.token_entries USING btree (user_id, "timestamp" DESC);


--
-- Name: idx_tool_invocations_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_invocations_session ON public.tool_invocations USING btree (session_id);


--
-- Name: idx_tool_invocations_tool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_invocations_tool ON public.tool_invocations USING btree (tool_name);


--
-- Name: idx_tool_invocations_user_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_invocations_user_timestamp ON public.tool_invocations USING btree (user_id, "timestamp" DESC);


--
-- Name: idx_unique_project_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_project_per_user ON public.projects USING btree (user_id, name);


--
-- Name: idx_unique_token_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_token_entry ON public.token_entries USING btree (user_id, session_id, model, input_tokens, output_tokens, cache_read, cache_write, "timestamp");


--
-- Name: idx_user_pricing_overrides_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_pricing_overrides_lookup ON public.user_pricing_overrides USING btree (user_id, model_key);


--
-- Name: idx_users_webhook_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_webhook_token_hash ON public.users USING btree (webhook_token_hash) WHERE (webhook_token_hash IS NOT NULL);


--
-- Name: compactions compactions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compactions
    ADD CONSTRAINT compactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: compactions compactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compactions
    ADD CONSTRAINT compactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: skill_invocations skill_invocations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_invocations
    ADD CONSTRAINT skill_invocations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: skill_invocations skill_invocations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_invocations
    ADD CONSTRAINT skill_invocations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: token_entries token_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_entries
    ADD CONSTRAINT token_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tool_invocations tool_invocations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_invocations
    ADD CONSTRAINT tool_invocations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: tool_invocations tool_invocations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_invocations
    ADD CONSTRAINT tool_invocations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_pricing_overrides user_pricing_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pricing_overrides
    ADD CONSTRAINT user_pricing_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict rgU1b1qUsAK7jEjOEMfx01RxXl3JoqGFJYYHMGxRl8YUeV9mhbNMilidIUYAJ3e

