-- Migration: 0009_external_widget_system.sql
-- Description: Ensure public_id on widget_settings and create widget_domains table for allowed domain authorization.

-- 1. Ensure public_id column on widget_settings
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS public_id text UNIQUE;

-- Backfill any existing widget_settings rows with a random identifier if null
UPDATE public.widget_settings
SET public_id = 'spw_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24)
WHERE public_id IS NULL;

-- Set default for future inserts
ALTER TABLE public.widget_settings
  ALTER COLUMN public_id SET DEFAULT ('spw_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));

-- Index on public_id
CREATE INDEX IF NOT EXISTS idx_widget_settings_public_id
  ON public.widget_settings (public_id);

-- 2. Create widget_domains table for custom external allowed domains
CREATE TABLE IF NOT EXISTS public.widget_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_domain UNIQUE (user_id, domain)
);

-- Indexes for domain lookups
CREATE INDEX IF NOT EXISTS idx_widget_domains_user_id
  ON public.widget_domains (user_id);

CREATE INDEX IF NOT EXISTS idx_widget_domains_domain
  ON public.widget_domains (domain);

-- 3. Row Level Security for widget_domains
ALTER TABLE public.widget_domains ENABLE ROW LEVEL SECURITY;

-- Allow merchants to manage their own allowed domains
DROP POLICY IF EXISTS "Merchants can view their own allowed domains" ON public.widget_domains;
CREATE POLICY "Merchants can view their own allowed domains"
  ON public.widget_domains
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Merchants can insert their own allowed domains" ON public.widget_domains;
CREATE POLICY "Merchants can insert their own allowed domains"
  ON public.widget_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Merchants can delete their own allowed domains" ON public.widget_domains;
CREATE POLICY "Merchants can delete their own allowed domains"
  ON public.widget_domains
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

