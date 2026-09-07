-- Migration: 0015_products_unique_constraint.sql
-- Description: Create unique index on public.products (user_id, external_id) for safe idempotent upserts

CREATE UNIQUE INDEX IF NOT EXISTS products_user_external_idx
ON public.products (user_id, external_id);

