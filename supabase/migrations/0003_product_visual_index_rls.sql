-- ============================================================================
-- 0003_product_visual_index_rls.sql
-- Merchant isolation + ownership for the product visual index.
--
-- Migration 0002 created product_visual_embeddings WITHOUT an owner column and
-- WITHOUT Row Level Security. That means any anon/service client could read or
-- write every merchant's image index. This migration is ADDITIVE and safe:
--
--   * Adds a user_id column (the merchant/profile that owns each row).
--   * Adds a supporting btree index on (user_id, product_id).
--   * Enables RLS and adds owner-scoped policies so one merchant can never see
--     or mutate another merchant's visual index.
--
-- The application talks to this table via the service-role key (which bypasses
-- RLS), so enabling RLS does not break the crawler/shopify sync indexing jobs.
-- Anonymous/widget clients are blocked from cross-merchant reads/writes.
-- ============================================================================

-- Owner column (merchant profile id / auth uid).
alter table public.product_visual_embeddings
    add column if not exists user_id uuid;

-- Lookup + isolation index.
create index if not exists product_visual_embeddings_user_idx
    on public.product_visual_embeddings (user_id, product_id);

-- ----------------------------------------------------------------------------
-- Row Level Security (owner-scoped). Must be enabled AFTER ownership column.
-- ----------------------------------------------------------------------------
alter table public.product_visual_embeddings enable row level security;

drop policy if exists "Merchants can view their own visual index"
    on public.product_visual_embeddings;
create policy "Merchants can view their own visual index"
    on public.product_visual_embeddings
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert their own visual index"
    on public.product_visual_embeddings;
create policy "Merchants can insert their own visual index"
    on public.product_visual_embeddings
    for insert
    with check (user_id = auth.uid());

drop policy if exists "Merchants can update their own visual index"
    on public.product_visual_embeddings;
create policy "Merchants can update their own visual index"
    on public.product_visual_embeddings
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Merchants can delete their own visual index"
    on public.product_visual_embeddings;
create policy "Merchants can delete their own visual index"
    on public.product_visual_embeddings
    for delete
    using (user_id = auth.uid());
