-- SQL Migration Blueprint Schema setup for Sales Pilot Database Stack
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE,
    business_name TEXT,
    website_url TEXT,
    category TEXT,
    logo_url TEXT,
    ai_name TEXT DEFAULT 'Pilot AI',
    welcome_message TEXT,
    theme_color TEXT DEFAULT '#4F46E5'
);

CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- 'url', 'pdf', 'docx', 'csv'
    source_name TEXT NOT NULL,
    chunk_count INT DEFAULT 0,
    status TEXT DEFAULT 'processed',
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversations (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    visitor_session_id TEXT NOT NULL,
    status TEXT DEFAULT 'resolved', -- 'resolved', 'pending', 'escalated'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);