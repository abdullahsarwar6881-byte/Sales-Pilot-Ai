-- ============================================================================
-- 0005_add_widget_public_id.sql
-- Sales Pilot — Public Widget Identifier & Domain Security
-- ============================================================================
-- Purpose:
--   1. Add a public, cryptographically random widget identifier (public_id)
--      to widget_settings so client-side JavaScript never needs to expose
--      the merchant's Supabase auth user_id or internal database keys.
--   2. Backfill existing records with a secure 'wp_' prefixed random string.
--   3. Add index on public_id for sub-millisecond public API lookup.
-- ============================================================================

alter table public.widget_settings
add column if not exists public_id text unique;

-- Backfill any existing widget_settings rows with a random 24-character hex identifier
update public.widget_settings
set public_id = 'wp_' || encode(gen_random_bytes(12), 'hex')
where public_id is null;

-- Ensure default for future inserts
alter table public.widget_settings
alter column public_id set default ('wp_' || encode(gen_random_bytes(12), 'hex'));

-- Create index for fast public lookup
create index if not exists idx_widget_settings_public_id
on public.widget_settings (public_id);

