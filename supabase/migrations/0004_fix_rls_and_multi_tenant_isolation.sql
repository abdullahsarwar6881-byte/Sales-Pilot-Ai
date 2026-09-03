-- ============================================================================
-- 0004_fix_rls_and_multi_tenant_isolation.sql
-- Sales Pilot — Row Level Security & Multi-Tenant Data Isolation
-- ============================================================================
-- Design & Security Guarantees:
--   1. Every merchant can only read and modify their own records.
--   2. Cross-tenant access between merchants is completely blocked.
--   3. Anonymous clients (using the public anon key) are blocked from selecting
--      or modifying sensitive merchant data (profiles, conversations, messages,
--      crawled knowledge, documents, Shopify access tokens, billing data).
--   4. The server-side service role (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS
--      automatically in Supabase, preserving chat, crawler, embeddings, Shopify
--      sync, and billing webhook functionality.
--   5. The public chat widget communicates via secure server-side API routes
--      (/api/chat, /api/widget-config) and does not require direct table access.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Merchants can view own profile" on public.profiles;
create policy "Merchants can view own profile"
    on public.profiles
    for select
    using (id = auth.uid());

drop policy if exists "Merchants can update own profile" on public.profiles;
create policy "Merchants can update own profile"
    on public.profiles
    for update
    using (id = auth.uid())
    with check (id = auth.uid());

drop policy if exists "Merchants can insert own profile" on public.profiles;
create policy "Merchants can insert own profile"
    on public.profiles
    for insert
    with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. Conversations
-- ----------------------------------------------------------------------------
alter table public.conversations enable row level security;

drop policy if exists "Merchants can view own conversations" on public.conversations;
create policy "Merchants can view own conversations"
    on public.conversations
    for select
    using (user_id = auth.uid() or profile_id = auth.uid());

drop policy if exists "Merchants can insert own conversations" on public.conversations;
create policy "Merchants can insert own conversations"
    on public.conversations
    for insert
    with check (user_id = auth.uid() or profile_id = auth.uid());

drop policy if exists "Merchants can update own conversations" on public.conversations;
create policy "Merchants can update own conversations"
    on public.conversations
    for update
    using (user_id = auth.uid() or profile_id = auth.uid())
    with check (user_id = auth.uid() or profile_id = auth.uid());

drop policy if exists "Merchants can delete own conversations" on public.conversations;
create policy "Merchants can delete own conversations"
    on public.conversations
    for delete
    using (user_id = auth.uid() or profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Conversation Messages
-- ----------------------------------------------------------------------------
alter table public.conversation_messages enable row level security;

drop policy if exists "Merchants can view messages in own conversations" on public.conversation_messages;
create policy "Merchants can view messages in own conversations"
    on public.conversation_messages
    for select
    using (
        exists (
            select 1 from public.conversations
            where conversations.id = conversation_messages.conversation_id
            and (conversations.user_id = auth.uid() or conversations.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can insert messages in own conversations" on public.conversation_messages;
create policy "Merchants can insert messages in own conversations"
    on public.conversation_messages
    for insert
    with check (
        exists (
            select 1 from public.conversations
            where conversations.id = conversation_messages.conversation_id
            and (conversations.user_id = auth.uid() or conversations.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can update messages in own conversations" on public.conversation_messages;
create policy "Merchants can update messages in own conversations"
    on public.conversation_messages
    for update
    using (
        exists (
            select 1 from public.conversations
            where conversations.id = conversation_messages.conversation_id
            and (conversations.user_id = auth.uid() or conversations.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can delete messages in own conversations" on public.conversation_messages;
create policy "Merchants can delete messages in own conversations"
    on public.conversation_messages
    for delete
    using (
        exists (
            select 1 from public.conversations
            where conversations.id = conversation_messages.conversation_id
            and (conversations.user_id = auth.uid() or conversations.profile_id = auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- 4. Knowledge Pages
-- ----------------------------------------------------------------------------
alter table public.knowledge_pages enable row level security;

drop policy if exists "Merchants can view own knowledge pages" on public.knowledge_pages;
create policy "Merchants can view own knowledge pages"
    on public.knowledge_pages
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own knowledge pages" on public.knowledge_pages;
create policy "Merchants can insert own knowledge pages"
    on public.knowledge_pages
    for insert
    with check (user_id = auth.uid());

drop policy if exists "Merchants can update own knowledge pages" on public.knowledge_pages;
create policy "Merchants can update own knowledge pages"
    on public.knowledge_pages
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Merchants can delete own knowledge pages" on public.knowledge_pages;
create policy "Merchants can delete own knowledge pages"
    on public.knowledge_pages
    for delete
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. Knowledge Chunks
-- ----------------------------------------------------------------------------
alter table public.knowledge_chunks enable row level security;

drop policy if exists "Merchants can view own knowledge chunks" on public.knowledge_chunks;
create policy "Merchants can view own knowledge chunks"
    on public.knowledge_chunks
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own knowledge chunks" on public.knowledge_chunks;
create policy "Merchants can insert own knowledge chunks"
    on public.knowledge_chunks
    for insert
    with check (user_id = auth.uid());

drop policy if exists "Merchants can update own knowledge chunks" on public.knowledge_chunks;
create policy "Merchants can update own knowledge chunks"
    on public.knowledge_chunks
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Merchants can delete own knowledge chunks" on public.knowledge_chunks;
create policy "Merchants can delete own knowledge chunks"
    on public.knowledge_chunks
    for delete
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. Knowledge Documents
-- ----------------------------------------------------------------------------
alter table public.knowledge_documents enable row level security;

drop policy if exists "Merchants can view own knowledge documents" on public.knowledge_documents;
create policy "Merchants can view own knowledge documents"
    on public.knowledge_documents
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own knowledge documents" on public.knowledge_documents;
create policy "Merchants can insert own knowledge documents"
    on public.knowledge_documents
    for insert
    with check (user_id = auth.uid());

drop policy if exists "Merchants can update own knowledge documents" on public.knowledge_documents;
create policy "Merchants can update own knowledge documents"
    on public.knowledge_documents
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Merchants can delete own knowledge documents" on public.knowledge_documents;
create policy "Merchants can delete own knowledge documents"
    on public.knowledge_documents
    for delete
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 7. Knowledge URLs
-- ----------------------------------------------------------------------------
alter table public.knowledge_urls enable row level security;

drop policy if exists "Merchants can view own knowledge urls" on public.knowledge_urls;
create policy "Merchants can view own knowledge urls"
    on public.knowledge_urls
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own knowledge urls" on public.knowledge_urls;
create policy "Merchants can insert own knowledge urls"
    on public.knowledge_urls
    for insert
    with check (user_id = auth.uid());

drop policy if exists "Merchants can update own knowledge urls" on public.knowledge_urls;
create policy "Merchants can update own knowledge urls"
    on public.knowledge_urls
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Merchants can delete own knowledge urls" on public.knowledge_urls;
create policy "Merchants can delete own knowledge urls"
    on public.knowledge_urls
    for delete
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. Crawl Jobs
-- ----------------------------------------------------------------------------
alter table public.crawl_jobs enable row level security;

drop policy if exists "Merchants can view own crawl jobs" on public.crawl_jobs;
create policy "Merchants can view own crawl jobs"
    on public.crawl_jobs
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own crawl jobs" on public.crawl_jobs;
create policy "Merchants can insert own crawl jobs"
    on public.crawl_jobs
    for insert
    with check (user_id = auth.uid());

drop policy if exists "Merchants can update own crawl jobs" on public.crawl_jobs;
create policy "Merchants can update own crawl jobs"
    on public.crawl_jobs
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Merchants can delete own crawl jobs" on public.crawl_jobs;
create policy "Merchants can delete own crawl jobs"
    on public.crawl_jobs
    for delete
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 9. Widget Settings
-- ----------------------------------------------------------------------------
alter table public.widget_settings enable row level security;

drop policy if exists "Merchants can view own widget settings" on public.widget_settings;
create policy "Merchants can view own widget settings"
    on public.widget_settings
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own widget settings" on public.widget_settings;
create policy "Merchants can insert own widget settings"
    on public.widget_settings
    for insert
    with check (user_id = auth.uid());

drop policy if exists "Merchants can update own widget settings" on public.widget_settings;
create policy "Merchants can update own widget settings"
    on public.widget_settings
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Merchants can delete own widget settings" on public.widget_settings;
create policy "Merchants can delete own widget settings"
    on public.widget_settings
    for delete
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 10. Shopify Stores (Strictly protects Shopify access tokens)
-- ----------------------------------------------------------------------------
alter table public.shopify_stores enable row level security;

drop policy if exists "Merchants can view own shopify stores" on public.shopify_stores;
create policy "Merchants can view own shopify stores"
    on public.shopify_stores
    for select
    using (user_id = auth.uid() or profile_id = auth.uid());

drop policy if exists "Merchants can insert own shopify stores" on public.shopify_stores;
create policy "Merchants can insert own shopify stores"
    on public.shopify_stores
    for insert
    with check (user_id = auth.uid() or profile_id = auth.uid());

drop policy if exists "Merchants can update own shopify stores" on public.shopify_stores;
create policy "Merchants can update own shopify stores"
    on public.shopify_stores
    for update
    using (user_id = auth.uid() or profile_id = auth.uid())
    with check (user_id = auth.uid() or profile_id = auth.uid());

drop policy if exists "Merchants can delete own shopify stores" on public.shopify_stores;
create policy "Merchants can delete own shopify stores"
    on public.shopify_stores
    for delete
    using (user_id = auth.uid() or profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 11. Shopify Products
-- ----------------------------------------------------------------------------
alter table public.shopify_products enable row level security;

drop policy if exists "Merchants can view products of own stores" on public.shopify_products;
create policy "Merchants can view products of own stores"
    on public.shopify_products
    for select
    using (
        exists (
            select 1 from public.shopify_stores
            where shopify_stores.id = shopify_products.store_id
            and (shopify_stores.user_id = auth.uid() or shopify_stores.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can insert products into own stores" on public.shopify_products;
create policy "Merchants can insert products into own stores"
    on public.shopify_products
    for insert
    with check (
        exists (
            select 1 from public.shopify_stores
            where shopify_stores.id = shopify_products.store_id
            and (shopify_stores.user_id = auth.uid() or shopify_stores.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can update products of own stores" on public.shopify_products;
create policy "Merchants can update products of own stores"
    on public.shopify_products
    for update
    using (
        exists (
            select 1 from public.shopify_stores
            where shopify_stores.id = shopify_products.store_id
            and (shopify_stores.user_id = auth.uid() or shopify_stores.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can delete products of own stores" on public.shopify_products;
create policy "Merchants can delete products of own stores"
    on public.shopify_products
    for delete
    using (
        exists (
            select 1 from public.shopify_stores
            where shopify_stores.id = shopify_products.store_id
            and (shopify_stores.user_id = auth.uid() or shopify_stores.profile_id = auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- 12. Shopify Orders (Protects customer email, order details, total prices)
-- ----------------------------------------------------------------------------
alter table public.shopify_orders enable row level security;

drop policy if exists "Merchants can view orders of own stores" on public.shopify_orders;
create policy "Merchants can view orders of own stores"
    on public.shopify_orders
    for select
    using (
        exists (
            select 1 from public.shopify_stores
            where shopify_stores.id = shopify_orders.store_id
            and (shopify_stores.user_id = auth.uid() or shopify_stores.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can insert orders into own stores" on public.shopify_orders;
create policy "Merchants can insert orders into own stores"
    on public.shopify_orders
    for insert
    with check (
        exists (
            select 1 from public.shopify_stores
            where shopify_stores.id = shopify_orders.store_id
            and (shopify_stores.user_id = auth.uid() or shopify_stores.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can update orders of own stores" on public.shopify_orders;
create policy "Merchants can update orders of own stores"
    on public.shopify_orders
    for update
    using (
        exists (
            select 1 from public.shopify_stores
            where shopify_stores.id = shopify_orders.store_id
            and (shopify_stores.user_id = auth.uid() or shopify_stores.profile_id = auth.uid())
        )
    );

drop policy if exists "Merchants can delete orders of own stores" on public.shopify_orders;
create policy "Merchants can delete orders of own stores"
    on public.shopify_orders
    for delete
    using (
        exists (
            select 1 from public.shopify_stores
            where shopify_stores.id = shopify_orders.store_id
            and (shopify_stores.user_id = auth.uid() or shopify_stores.profile_id = auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- 13. Products (Catalog mirror)
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists "Merchants can view own products" on public.products;
create policy "Merchants can view own products"
    on public.products
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own products" on public.products;
create policy "Merchants can insert own products"
    on public.products
    for insert
    with check (user_id = auth.uid());

drop policy if exists "Merchants can update own products" on public.products;
create policy "Merchants can update own products"
    on public.products
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Merchants can delete own products" on public.products;
create policy "Merchants can delete own products"
    on public.products
    for delete
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 14. Subscriptions & Billing Transactions
-- ----------------------------------------------------------------------------
alter table public.subscriptions enable row level security;

drop policy if exists "Merchants can view own subscription" on public.subscriptions;
create policy "Merchants can view own subscription"
    on public.subscriptions
    for select
    using (user_id = auth.uid());

alter table public.billing_transactions enable row level security;

drop policy if exists "Merchants can view own billing transactions" on public.billing_transactions;
create policy "Merchants can view own billing transactions"
    on public.billing_transactions
    for select
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 15. Activities & AI Usage (Dashboard analytics & feed)
-- ----------------------------------------------------------------------------
alter table public.activities enable row level security;

drop policy if exists "Merchants can view own activities" on public.activities;
create policy "Merchants can view own activities"
    on public.activities
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own activities" on public.activities;
create policy "Merchants can insert own activities"
    on public.activities
    for insert
    with check (user_id = auth.uid());

alter table public.ai_usage enable row level security;

drop policy if exists "Merchants can view own ai usage" on public.ai_usage;
create policy "Merchants can view own ai usage"
    on public.ai_usage
    for select
    using (user_id = auth.uid());

drop policy if exists "Merchants can insert own ai usage" on public.ai_usage;
create policy "Merchants can insert own ai usage"
    on public.ai_usage
    for insert
    with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 16. Knowledge Base (Legacy / alternate table)
-- ----------------------------------------------------------------------------
alter table public.knowledge_base enable row level security;

drop policy if exists "Merchants can view own knowledge base" on public.knowledge_base;
create policy "Merchants can view own knowledge base"
    on public.knowledge_base
    for select
    using (profile_id = auth.uid());

