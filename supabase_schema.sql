-- ============================================================
-- DPM Plomberie CRM — Schéma complet
-- Colle tout ce SQL dans Supabase > SQL Editor > Run
-- ============================================================

-- Enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ── Tables sans dépendances ──

CREATE TABLE public.companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  raison_sociale text NOT NULL,
  siren text, siret text, code_naf text, forme_juridique text,
  date_creation text, adresse text, ville text, departement text, region text,
  telephone_standard text, email_generique text, site_internet text,
  linkedin_entreprise text, nombre_employes integer, tranche_effectif text,
  chiffre_affaires text, statut_activite text,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.scripts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text DEFAULT '' NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  body text DEFAULT '' NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.custom_fields (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name text NOT NULL,
  field_label text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.saved_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  mapping jsonb DEFAULT '{}' NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.sms_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text DEFAULT '' NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.gmail_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  gmail_address text DEFAULT '' NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ── Profiles (avec crm_role) ──
CREATE TABLE public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  email text,
  phone text,
  crm_role text DEFAULT 'commercial' NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL
);

-- ── Campaigns (avec assigned_to) ──
CREATE TABLE public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  objective text,
  status text DEFAULT 'active' NOT NULL,
  owner_id uuid NOT NULL,
  assigned_to uuid,
  script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  email_template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ── Prospects ──
CREATE TABLE public.prospects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text, last_name text, company text, poste text,
  email text, phone text, linkedin text, city text, source text,
  status text DEFAULT 'nouveau' NOT NULL,
  product_status text DEFAULT 'non_qualifie' NOT NULL,
  score integer DEFAULT 0,
  score_dispersion integer, interest_level integer, urgency text,
  estimated_budget text, main_problems text[], notes_internes text,
  refusal_reason text, uses_software text, software_name text,
  specialty text, company_size text, structure_entreprise text,
  nb_chantiers_semaine integer, nb_devis_semaine integer,
  temps_admin_jour text,
  nb_clients_crees integer DEFAULT 0 NOT NULL,
  nb_devis_crees integer DEFAULT 0 NOT NULL,
  total_calls integer, total_attempts integer,
  last_contact timestamptz, next_followup timestamptz,
  date_premier_contact timestamptz, date_premiere_connexion timestamptz,
  date_compte_cree timestamptz, date_derniere_activite timestamptz,
  owner_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ── Tables dépendantes des prospects ──
CREATE TABLE public.actions_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  details jsonb,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time,
  address text, notes text, cancellation_reason text,
  status text DEFAULT 'booked' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.call_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  duration_seconds integer, outcome text, call_qualification text, notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reminder_type text DEFAULT 'appel' NOT NULL,
  reminder_date date NOT NULL,
  reminder_time time,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.prospect_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.custom_field_values (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  custom_field_id uuid NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.daily_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  stat_date date DEFAULT CURRENT_DATE NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  total_calls integer, total_contacts integer, total_rdv integer,
  total_emails integer, total_sms integer,
  avg_call_duration numeric, conversion_rate numeric,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.email_automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  delay_days integer DEFAULT 0 NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  filters jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

-- ============================================================
-- RLS — accès complet pour tous les utilisateurs authentifiés
-- ============================================================

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','campaigns','prospects','actions_log','appointments',
    'call_sessions','reminders','scripts','email_templates','tags',
    'prospect_tags','companies','custom_fields','custom_field_values',
    'daily_stats','email_automations','saved_mappings','sms_templates',
    'gmail_tokens','user_roles'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- Fonctions
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.compute_prospect_score(p_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_score integer := 0;
  v_prospect public.prospects%ROWTYPE;
BEGIN
  SELECT * INTO v_prospect FROM public.prospects WHERE id = p_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  v_score := v_score + COALESCE(v_prospect.interest_level, 0) * 3;
  v_score := v_score + LEAST(COALESCE(v_prospect.total_calls, 0), 5) * 2;
  CASE v_prospect.product_status
    WHEN 'rdv_booke'     THEN v_score := v_score + 10;
    WHEN 'demo_faite'    THEN v_score := v_score + 15;
    WHEN 'compte_cree'   THEN v_score := v_score + 20;
    WHEN 'compte_active' THEN v_score := v_score + 25;
    WHEN 'user_actif'    THEN v_score := v_score + 30;
    WHEN 'client_payant' THEN v_score := v_score + 40;
    ELSE NULL;
  END CASE;
  RETURN v_score;
END;
$$;

-- ── Trigger auto-création de profil à l'inscription ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, full_name, email, crm_role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      'commercial'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
