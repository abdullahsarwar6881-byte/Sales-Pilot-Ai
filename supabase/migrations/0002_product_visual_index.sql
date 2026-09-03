-- ============================================================================
-- 0002_product_visual_index.sql
-- Product visual index for multimodal image matching.
--
-- Design:
--   * One row per product image (a catalog product may have many images).
--   * image_url is the normalized source image URL.
--   * image_hash is a stable dedup key (sha256 of the normalized URL).
--   * visual_embedding is materialized AFTER a vision/feature pass; NULL until
--     the indexing job runs. It is NOT used for blocking chat latency — chat
--     matches against the pre-built index.
--   * image_metadata stores structured vision features (colors, category,
--     garment attributes, description) as jsonb.
--   * store_id/product_id reference whichever catalog source produced the item.
--
-- Backward compatible / idempotent. Does not alter existing tables or RLS
-- beyond the new table.
-- ============================================================================


-- ============================================================================
-- Product visual embeddings
-- ============================================================================
create table if not exists public.product_visual_embeddings (
    id               uuid primary key default gen_random_uuid(),
    store_id         uuid,
    product_id       uuid,
    product_key      text,              -- stable logical key: e.g. shopify_id or external_id+url
    image_url        text,
    image_hash       text,
    visual_embedding vector(1024),
    image_metadata   jsonb,
    source           text default 'catalog',  -- 'shopify' | 'crawler' | 'website' | ...
    is_primary       boolean default false,
    created_at       timestamptz default now(),
    updated_at       timestamptz default now()
);

alter table public.product_visual_embeddings
    add column if not exists store_id uuid;
alter table public.product_visual_embeddings
    add column if not exists product_id uuid;
alter table public.product_visual_embeddings
    add column if not exists product_key text;
alter table public.product_visual_embeddings
    add column if not exists image_url text;
alter table public.product_visual_embeddings
    add column if not exists image_hash text;
alter table public.product_visual_embeddings
    add column if not exists visual_embedding vector(1024);
alter table public.product_visual_embeddings
    add column if not exists image_metadata jsonb;
alter table public.product_visual_embeddings
    add column if not exists source text default 'catalog';
alter table public.product_visual_embeddings
    add column if not exists is_primary boolean default false;
alter table public.product_visual_embeddings
    add column if not exists created_at timestamptz default now();
alter table public.product_visual_embeddings
    add column if not exists updated_at timestamptz default now();

-- Dedup + lookup by image hash (multiple products can share an image).
create unique index if not exists product_visual_embeddings_hash_idx
    on public.product_visual_embeddings (image_hash);

create index if not exists product_visual_embeddings_product_idx
    on public.product_visual_embeddings (product_id, store_id);

create index if not exists product_visual_embeddings_vector_idx
    on public.product_visual_embeddings
    using hnsw (visual_embedding vector_cosine_ops);

