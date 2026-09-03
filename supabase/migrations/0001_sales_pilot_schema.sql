-- ============================================================================
-- Sales Pilot — Safe, Non-Destructive Baseline Migration
-- ============================================================================
-- NOTE TO REVIEWER / RUN JUSTIFICATION:
--   This migration is NON-DESTRUCTIVE:
--   - It never drops, renames, or alters existing columns/tables.
--   - It uses CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS only.
--   - It does NOT create, recreate, or modify any RPC functions.
--     (match_knowledge_chunks, match_knowledge_chunks_for_user, and
--     create_default_billing_subscription already live in Supabase and are
--     intentionally left untouched.)
--   - It does NOT enable restrictive RLS or add RLS policies.
--   - The live Supabase database remains the source of truth.
--
-- Built from app code usage (lib/, app/api/) because supabase/schema.sql is
-- incomplete. Every column below is referenced by the application.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions (idempotent; required for uuid defaults and the vector column)
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ============================================================================
-- Profiles
-- ============================================================================
create table if not exists public.profiles (
    id            uuid primary key references auth.users (id),
    full_name     text,
    avatar_url    text,
    business_name text,
    website_url   text,
    category      text,
    logo_url      text,
    ai_name       text default 'Pilot AI',
    welcome_message text,
    theme_color   text default '#4F46E5',
    updated_at    timestamptz default now()
);

-- Column maintenace for pre-existing profiles rows (idempotent).
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists category text;
alter table public.profiles add column if not exists logo_url text;
alter table public.profiles add column if not exists ai_name text;
alter table public.profiles add column if not exists welcome_message text;
alter table public.profiles add column if not exists theme_color text;
alter table public.profiles add column if not exists updated_at timestamptz;

-- ============================================================================
-- Knowledge Base
-- ============================================================================
create table if not exists public.knowledge_base (
    id          bigserial primary key,
    profile_id  uuid references public.profiles (id) on delete cascade,
    source_type text,
    source_name text,
    chunk_count integer default 0,
    status      text default 'processed',
    last_synced timestamptz default now()
);

alter table public.knowledge_base add column if not exists profile_id uuid;
alter table public.knowledge_base add column if not exists source_type text;
alter table public.knowledge_base add column if not exists source_name text;
alter table public.knowledge_base add column if not exists chunk_count integer;
alter table public.knowledge_base add column if not exists status text;
alter table public.knowledge_base add column if not exists last_synced timestamptz;

-- ============================================================================
-- Conversations
-- ============================================================================
create table if not exists public.conversations (
    id                bigserial primary key,
    profile_id        uuid references public.profiles (id) on delete cascade,
    user_id           uuid references auth.users (id),
    visitor_session_id text,
    status            text default 'resolved',
    customer_name     text,
    customer_email    text,
    assigned_to       text default 'ai',
    response_time     numeric default 0,
    last_message      text,
    country           text,
    browser           text,
    current_page      text,
    created_at        timestamptz default now()
);

alter table public.conversations add column if not exists profile_id uuid;
alter table public.conversations add column if not exists user_id uuid;
alter table public.conversations add column if not exists visitor_session_id text;
alter table public.conversations add column if not exists status text;
alter table public.conversations add column if not exists customer_name text;
alter table public.conversations add column if not exists customer_email text;
alter table public.conversations add column if not exists assigned_to text;
alter table public.conversations add column if not exists response_time numeric;
alter table public.conversations add column if not exists last_message text;
alter table public.conversations add column if not exists country text;
alter table public.conversations add column if not exists browser text;
alter table public.conversations add column if not exists current_page text;
alter table public.conversations add column if not exists created_at timestamptz;

-- ============================================================================
-- Conversation Messages (used by the active chat pipeline)
-- ============================================================================
create table if not exists public.conversation_messages (
    id              bigserial primary key,
    conversation_id bigint references public.conversations (id),
    sender          text,
    content         text,
    created_at      timestamptz default now()
);

alter table public.conversation_messages add column if not exists conversation_id bigint;
alter table public.conversation_messages add column if not exists sender text;
alter table public.conversation_messages add column if not exists content text;
alter table public.conversation_messages add column if not exists created_at timestamptz;

-- ============================================================================
-- Widget Settings (single row per user; used by the embeddable widget)
-- ============================================================================
create table if not exists public.widget_settings (
    id                    uuid primary key default uuid_generate_v4(),
    user_id               uuid,
    ai_name               text default 'Pilot Bot',
    welcome_message       text default 'Hello! How can I assist your business today?',
    brand_color           text default '#4F46E5',
    position              text default 'Bottom Right',
    radius                text default 'Rounded',
    theme                 text default 'Light',
    size                  text default 'Medium',
    auto_open             boolean default false,
    show_typing_indicator boolean default true,
    sound_notifications   boolean default false,
    show_ai_avatar        boolean default true,
    collect_visitor_name  boolean default false,
    collect_visitor_email boolean default false,
    enable_animations     boolean default true,
    show_powered_by       boolean default true,
    created_at            timestamptz default now(),
    updated_at            timestamptz default now()
);

alter table public.widget_settings add column if not exists user_id uuid;
alter table public.widget_settings add column if not exists ai_name text;
alter table public.widget_settings add column if not exists welcome_message text;
alter table public.widget_settings add column if not exists brand_color text;
alter table public.widget_settings add column if not exists position text;
alter table public.widget_settings add column if not exists radius text;
alter table public.widget_settings add column if not exists theme text;
alter table public.widget_settings add column if not exists size text;
alter table public.widget_settings add column if not exists auto_open boolean;
alter table public.widget_settings add column if not exists show_typing_indicator boolean;
alter table public.widget_settings add column if not exists sound_notifications boolean;
alter table public.widget_settings add column if not exists show_ai_avatar boolean;
alter table public.widget_settings add column if not exists collect_visitor_name boolean;
alter table public.widget_settings add column if not exists collect_visitor_email boolean;
alter table public.widget_settings add column if not exists enable_animations boolean;
alter table public.widget_settings add column if not exists show_powered_by boolean;
alter table public.widget_settings add column if not exists created_at timestamptz;
alter table public.widget_settings add column if not exists updated_at timestamptz;

create unique index if not exists widget_settings_user_id_idx on public.widget_settings (user_id);

-- ============================================================================
-- Knowledge Urls (website sources)
-- ============================================================================
create table if not exists public.knowledge_urls (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid,
    url        text,
    status     text,
    created_at timestamptz default now()
);

alter table public.knowledge_urls add column if not exists user_id uuid;
alter table public.knowledge_urls add column if not exists url text;
alter table public.knowledge_urls add column if not exists status text;
alter table public.knowledge_urls add column if not exists created_at timestamptz;

-- ============================================================================
-- Crawl Jobs
-- ============================================================================
create table if not exists public.crawl_jobs (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid,
    url             text,
    status          text,
    total_pages     integer,
    pages_completed integer,
    started_at      timestamptz,
    finished_at     timestamptz,
    current_url     text,
    created_at      timestamptz default now()
);

alter table public.crawl_jobs add column if not exists user_id uuid;
alter table public.crawl_jobs add column if not exists url text;
alter table public.crawl_jobs add column if not exists status text;
alter table public.crawl_jobs add column if not exists total_pages integer;
alter table public.crawl_jobs add column if not exists pages_completed integer;
alter table public.crawl_jobs add column if not exists started_at timestamptz;
alter table public.crawl_jobs add column if not exists finished_at timestamptz;
alter table public.crawl_jobs add column if not exists current_url text;
alter table public.crawl_jobs add column if not exists created_at timestamptz;

-- ============================================================================
-- Knowledge Documents (uploaded files)
-- ============================================================================
create table if not exists public.knowledge_documents (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid,
    file_name         text,
    file_type         text,
    file_url          text,
    processing_status text,
    page_type         text,
    created_at        timestamptz default now()
);

alter table public.knowledge_documents add column if not exists user_id uuid;
alter table public.knowledge_documents add column if not exists file_name text;
alter table public.knowledge_documents add column if not exists file_type text;
alter table public.knowledge_documents add column if not exists file_url text;
alter table public.knowledge_documents add column if not exists processing_status text;
alter table public.knowledge_documents add column if not exists page_type text;
alter table public.knowledge_documents add column if not exists created_at timestamptz;

-- ============================================================================
-- Knowledge Pages
--   Preserves knowledge_pages.page_url (the application writes page_url).
-- ============================================================================
create table if not exists public.knowledge_pages (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid,
    knowledge_url_id uuid references public.knowledge_urls (id),
    title            text,
    page_url         text,
    content          text,
    page_type        text,
    created_at       timestamptz default now()
);

alter table public.knowledge_pages add column if not exists user_id uuid;
alter table public.knowledge_pages add column if not exists knowledge_url_id uuid;
alter table public.knowledge_pages add column if not exists title text;
alter table public.knowledge_pages add column if not exists page_url text;
alter table public.knowledge_pages add column if not exists content text;
alter table public.knowledge_pages add column if not exists page_type text;
alter table public.knowledge_pages add column if not exists created_at timestamptz;

-- ============================================================================
-- Knowledge Chunks (embeddings)
--   embedding is vector(768) — matches the OpenAI text-embedding-3-small
--   configuration in lib/ai/embeddings.ts (DIMENSIONS = 768) and the existing
--   live Supabase vector extension (0.8.2).
-- ============================================================================
create table if not exists public.knowledge_chunks (
    id                     uuid primary key default gen_random_uuid(),
    user_id                uuid,
    knowledge_page_id      uuid references public.knowledge_pages (id),
    knowledge_document_id  uuid references public.knowledge_documents (id),
    source_url             text,
    content                text,
    embedding              vector(768),
    created_at             timestamptz default now()
);

alter table public.knowledge_chunks add column if not exists user_id uuid;
alter table public.knowledge_chunks add column if not exists knowledge_page_id uuid;
alter table public.knowledge_chunks add column if not exists knowledge_document_id uuid;
alter table public.knowledge_chunks add column if not exists source_url text;
alter table public.knowledge_chunks add column if not exists content text;
alter table public.knowledge_chunks add column if not exists embedding vector(768);
alter table public.knowledge_chunks add column if not exists created_at timestamptz;

-- ============================================================================
-- Shopify Stores
-- ============================================================================
create table if not exists public.shopify_stores (
    id           uuid primary key default gen_random_uuid(),
    profile_id   uuid,
    shop_domain  text,
    access_token text,
    scope        text,
    is_active    boolean default true,
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

alter table public.shopify_stores add column if not exists profile_id uuid;
alter table public.shopify_stores add column if not exists shop_domain text;
alter table public.shopify_stores add column if not exists access_token text;
alter table public.shopify_stores add column if not exists scope text;
alter table public.shopify_stores add column if not exists is_active boolean;
alter table public.shopify_stores add column if not exists created_at timestamptz;
alter table public.shopify_stores add column if not exists updated_at timestamptz;

create unique index if not exists shopify_stores_shop_domain_idx on public.shopify_stores (shop_domain);

-- ============================================================================
-- Shopify Products (owned by shopify_stores)
-- ============================================================================
create table if not exists public.shopify_products (
    id           uuid primary key default gen_random_uuid(),
    store_id     uuid references public.shopify_stores (id),
    shopify_id   text,
    title        text,
    handle       text,
    description  text,
    status       text,
    product_type text,
    vendor       text,
    data         jsonb,
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

alter table public.shopify_products add column if not exists store_id uuid;
alter table public.shopify_products add column if not exists shopify_id text;
alter table public.shopify_products add column if not exists title text;
alter table public.shopify_products add column if not exists handle text;
alter table public.shopify_products add column if not exists description text;
alter table public.shopify_products add column if not exists status text;
alter table public.shopify_products add column if not exists product_type text;
alter table public.shopify_products add column if not exists vendor text;
alter table public.shopify_products add column if not exists data jsonb;
alter table public.shopify_products add column if not exists created_at timestamptz;
alter table public.shopify_products add column if not exists updated_at timestamptz;

-- Required for upsert onConflict: "store_id,shopify_id".
create unique index if not exists shopify_products_store_shopify_idx on public.shopify_products (store_id, shopify_id);

-- ============================================================================
-- Shopify Orders (owned by shopify_stores)
-- ============================================================================
create table if not exists public.shopify_orders (
    id                 uuid primary key default gen_random_uuid(),
    store_id           uuid references public.shopify_stores (id),
    shopify_id         text,
    order_number       text,
    email              text,
    customer_name      text,
    financial_status   text,
    fulfillment_status text,
    currency           text,
    total_price        numeric,
    created_at         timestamptz,
    updated_at         timestamptz default now(),
    data               jsonb
);

alter table public.shopify_orders add column if not exists store_id uuid;
alter table public.shopify_orders add column if not exists shopify_id text;
alter table public.shopify_orders add column if not exists order_number text;
alter table public.shopify_orders add column if not exists email text;
alter table public.shopify_orders add column if not exists customer_name text;
alter table public.shopify_orders add column if not exists financial_status text;
alter table public.shopify_orders add column if not exists fulfillment_status text;
alter table public.shopify_orders add column if not exists currency text;
alter table public.shopify_orders add column if not exists total_price numeric;
alter table public.shopify_orders add column if not exists created_at timestamptz;
alter table public.shopify_orders add column if not exists updated_at timestamptz;
alter table public.shopify_orders add column if not exists data jsonb;

-- Required for upsert onConflict: "store_id,shopify_id".
create unique index if not exists shopify_orders_store_shopify_idx on public.shopify_orders (store_id, shopify_id);

-- ============================================================================
-- Products (catalog mirror; currently surfaced via knowledge_pages in search)
-- ============================================================================
create table if not exists public.products (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid,
    external_id      text,
    title            text,
    handle           text,
    description      text,
    price            numeric,
    currency         text,
    available        boolean,
    image_url        text,
    product_url      text,
    sku              text,
    collection_names text[] default '{}',
    collection_urls  text[] default '{}',
    source           text default 'website',
    created_at       timestamptz default now(),
    updated_at       timestamptz default now()
);

alter table public.products add column if not exists user_id uuid;
alter table public.products add column if not exists external_id text;
alter table public.products add column if not exists title text;
alter table public.products add column if not exists handle text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists price numeric;
alter table public.products add column if not exists currency text;
alter table public.products add column if not exists available boolean;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists product_url text;
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists collection_names text[];
alter table public.products add column if not exists collection_urls text[];
alter table public.products add column if not exists source text;
alter table public.products add column if not exists created_at timestamptz;
alter table public.products add column if not exists updated_at timestamptz;

-- ============================================================================
-- Subscriptions (billing)
-- ============================================================================
create table if not exists public.subscriptions (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid,
    plan_id             text,
    status              text,
    billing_cycle       text,
    current_period_start timestamptz,
    current_period_end  timestamptz,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

alter table public.subscriptions add column if not exists user_id uuid;
alter table public.subscriptions add column if not exists plan_id text;
alter table public.subscriptions add column if not exists status text;
alter table public.subscriptions add column if not exists billing_cycle text;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists created_at timestamptz;
alter table public.subscriptions add column if not exists updated_at timestamptz;

-- Required for upsert onConflict: "user_id".
create unique index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

-- ============================================================================
-- Billing Transactions (Safepay payments)
-- ============================================================================
create table if not exists public.billing_transactions (
    id                     uuid primary key default gen_random_uuid(),
    user_id                uuid,
    reference              text,
    amount                 numeric,
    currency               text,
    status                 text,
    description            text,
    provider               text,
    provider_payment_id    text,
    provider_transaction_id text,
    metadata               jsonb,
    created_at             timestamptz default now(),
    updated_at             timestamptz default now()
);

alter table public.billing_transactions add column if not exists user_id uuid;
alter table public.billing_transactions add column if not exists reference text;
alter table public.billing_transactions add column if not exists amount numeric;
alter table public.billing_transactions add column if not exists currency text;
alter table public.billing_transactions add column if not exists status text;
alter table public.billing_transactions add column if not exists description text;
alter table public.billing_transactions add column if not exists provider text;
alter table public.billing_transactions add column if not exists provider_payment_id text;
alter table public.billing_transactions add column if not exists provider_transaction_id text;
alter table public.billing_transactions add column if not exists metadata jsonb;
alter table public.billing_transactions add column if not exists created_at timestamptz;
alter table public.billing_transactions add column if not exists updated_at timestamptz;

-- ============================================================================
-- Activities (dashboard feed)
-- ============================================================================
create table if not exists public.activities (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid,
    type        text,
    title       text,
    description text,
    created_at  timestamptz default now()
);

alter table public.activities add column if not exists user_id uuid;
alter table public.activities add column if not exists type text;
alter table public.activities add column if not exists title text;
alter table public.activities add column if not exists description text;
alter table public.activities add column if not exists created_at timestamptz;

-- ============================================================================
-- AI Usage (dashboard performance)
-- ============================================================================
create table if not exists public.ai_usage (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid,
    accuracy         numeric,
    resolved_count   integer,
    avg_reply_time   numeric,
    created_at       timestamptz default now()
);

alter table public.ai_usage add column if not exists user_id uuid;
alter table public.ai_usage add column if not exists accuracy numeric;
alter table public.ai_usage add column if not exists resolved_count integer;
alter table public.ai_usage add column if not exists avg_reply_time numeric;
alter table public.ai_usage add column if not exists created_at timestamptz;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- NOT recreated here (present in live Supabase; verify before a fresh DB):
--   - messages (legacy; app uses conversation_messages)
--   - billing_usage (legacy counters; usage is computed live from tables)
--   - website_contents, widgets, faqs (shapes not confirmed from app code)
--
-- RPCs intentionally untouched:
--   - match_knowledge_chunks
--   - match_knowledge_chunks_for_user
--   - create_default_billing_subscription (trigger)
--
-- RLS intentionally left as-is. Supabase currently reports RLS DISABLED for
-- website_contents, widgets, activities, and ai_usage. Enabling RLS without
-- matching policies would lock those tables; do this deliberately, not here.
-- ============================================================================
