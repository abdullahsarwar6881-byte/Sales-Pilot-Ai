-- ============================================================================
-- Migration 0010: Usage Tracking + Rate Limiting + AI Cost Protection
-- ============================================================================

-- 1. Create usage_records table (Raw usage audit log)
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES public.conversations(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'message', 'embedding', 'chat_completion', 'vision_analysis'
    model TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0.000000,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for usage_records
CREATE INDEX IF NOT EXISTS idx_usage_records_profile_created 
    ON public.usage_records (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_conversation 
    ON public.usage_records (conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_event_type 
    ON public.usage_records (event_type);

-- 2. Create monthly_usage table (Fast aggregates and atomic limit enforcement)
CREATE TABLE IF NOT EXISTS public.monthly_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    billing_period TEXT NOT NULL, -- YYYY-MM format
    ai_messages INTEGER NOT NULL DEFAULT 0,
    ai_responses INTEGER NOT NULL DEFAULT 0,
    embedding_requests INTEGER NOT NULL DEFAULT 0,
    input_tokens BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_monthly_usage_profile_period UNIQUE (profile_id, billing_period)
);

-- Indexes for monthly_usage
CREATE INDEX IF NOT EXISTS idx_monthly_usage_profile_period 
    ON public.monthly_usage (profile_id, billing_period);

-- 3. Create rate_limits table (Distributed rate limiting across serverless instances)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires 
    ON public.rate_limits (expires_at);

-- 4. Function: Atomic Distributed Rate Limiter
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
    p_key TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_expires_at TIMESTAMPTZ := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    v_row public.rate_limits%ROWTYPE;
    v_allowed BOOLEAN;
    v_remaining INTEGER;
    v_retry_after INTEGER := 0;
BEGIN
    -- Upsert the counter atomically
    INSERT INTO public.rate_limits (key, count, window_start, expires_at, updated_at)
    VALUES (p_key, 1, v_now, v_expires_at, v_now)
    ON CONFLICT (key) DO UPDATE
    SET
        count = CASE 
            WHEN rate_limits.expires_at < v_now THEN 1
            ELSE rate_limits.count + 1
        END,
        window_start = CASE
            WHEN rate_limits.expires_at < v_now THEN v_now
            ELSE rate_limits.window_start
        END,
        expires_at = CASE
            WHEN rate_limits.expires_at < v_now THEN v_expires_at
            ELSE rate_limits.expires_at
        END,
        updated_at = v_now
    RETURNING * INTO v_row;

    IF v_row.count <= p_limit THEN
        v_allowed := TRUE;
        v_remaining := p_limit - v_row.count;
        v_retry_after := 0;
    ELSE
        v_allowed := FALSE;
        v_remaining := 0;
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.expires_at - v_now)))::INTEGER);
    END IF;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'count', v_row.count,
        'limit', p_limit,
        'remaining', v_remaining,
        'retry_after', v_retry_after
    );
END;
$$;

-- 5. Function: Atomic Merchant Usage Reservation (Prevents Race Conditions)
CREATE OR REPLACE FUNCTION public.reserve_merchant_usage(
    p_profile_id UUID,
    p_billing_period TEXT,
    p_max_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_current_usage INTEGER := 0;
    v_row public.monthly_usage%ROWTYPE;
BEGIN
    -- Lock and insert / get current usage for merchant in this period
    INSERT INTO public.monthly_usage (profile_id, billing_period, ai_messages, created_at, updated_at)
    VALUES (p_profile_id, p_billing_period, 0, v_now, v_now)
    ON CONFLICT (profile_id, billing_period) DO NOTHING;

    -- Select with FOR UPDATE to prevent race conditions during concurrent requests
    SELECT * INTO v_row
    FROM public.monthly_usage
    WHERE profile_id = p_profile_id AND billing_period = p_billing_period
    FOR UPDATE;

    v_current_usage := COALESCE(v_row.ai_messages, 0);

    -- Check if limit is reached
    IF v_current_usage >= p_max_limit THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'used', v_current_usage,
            'limit', p_max_limit,
            'remaining', 0
        );
    END IF;

    -- Atomically reserve 1 message
    UPDATE public.monthly_usage
    SET ai_messages = ai_messages + 1,
        updated_at = v_now
    WHERE profile_id = p_profile_id AND billing_period = p_billing_period
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
        'allowed', TRUE,
        'used', v_row.ai_messages,
        'limit', p_max_limit,
        'remaining', GREATEST(0, p_max_limit - v_row.ai_messages)
    );
END;
$$;

-- 6. Function: Reconcile Merchant Usage (Rollback reservation if AI failed)
CREATE OR REPLACE FUNCTION public.reconcile_merchant_usage(
    p_profile_id UUID,
    p_billing_period TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.monthly_usage
    SET ai_messages = GREATEST(0, ai_messages - 1),
        updated_at = NOW()
    WHERE profile_id = p_profile_id AND billing_period = p_billing_period;
END;
$$;

-- 7. Function: Record AI Usage Event
CREATE OR REPLACE FUNCTION public.record_ai_usage_event(
    p_profile_id UUID,
    p_conversation_id BIGINT,
    p_billing_period TEXT,
    p_event_type TEXT,
    p_model TEXT,
    p_prompt_tokens INTEGER,
    p_completion_tokens INTEGER,
    p_estimated_cost NUMERIC,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record_id UUID;
    v_total_tokens INTEGER := COALESCE(p_prompt_tokens, 0) + COALESCE(p_completion_tokens, 0);
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Insert raw record
    INSERT INTO public.usage_records (
        profile_id,
        conversation_id,
        event_type,
        model,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        estimated_cost,
        success,
        error_message,
        metadata,
        created_at
    )
    VALUES (
        p_profile_id,
        p_conversation_id,
        p_event_type,
        p_model,
        COALESCE(p_prompt_tokens, 0),
        COALESCE(p_completion_tokens, 0),
        v_total_tokens,
        COALESCE(p_estimated_cost, 0.000000),
        p_success,
        p_error_message,
        COALESCE(p_metadata, '{}'::jsonb),
        v_now
    )
    RETURNING id INTO v_record_id;

    -- Increment monthly aggregates
    IF p_billing_period IS NOT NULL THEN
        INSERT INTO public.monthly_usage (
            profile_id,
            billing_period,
            ai_messages,
            ai_responses,
            embedding_requests,
            input_tokens,
            output_tokens,
            total_tokens,
            estimated_cost,
            created_at,
            updated_at
        )
        VALUES (
            p_profile_id,
            p_billing_period,
            0,
            CASE WHEN p_event_type IN ('chat_completion', 'vision_analysis') AND p_success THEN 1 ELSE 0 END,
            CASE WHEN p_event_type = 'embedding' AND p_success THEN 1 ELSE 0 END,
            COALESCE(p_prompt_tokens, 0),
            COALESCE(p_completion_tokens, 0),
            v_total_tokens,
            COALESCE(p_estimated_cost, 0.000000),
            v_now,
            v_now
        )
        ON CONFLICT (profile_id, billing_period) DO UPDATE
        SET
            ai_responses = monthly_usage.ai_responses + CASE WHEN p_event_type IN ('chat_completion', 'vision_analysis') AND p_success THEN 1 ELSE 0 END,
            embedding_requests = monthly_usage.embedding_requests + CASE WHEN p_event_type = 'embedding' AND p_success THEN 1 ELSE 0 END,
            input_tokens = monthly_usage.input_tokens + COALESCE(p_prompt_tokens, 0),
            output_tokens = monthly_usage.output_tokens + COALESCE(p_completion_tokens, 0),
            total_tokens = monthly_usage.total_tokens + v_total_tokens,
            estimated_cost = monthly_usage.estimated_cost + COALESCE(p_estimated_cost, 0.000000),
            updated_at = v_now;
    END IF;

    RETURN v_record_id;
END;
$$;

-- 8. Enable Row Level Security
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies: Merchants can only select their own usage
DROP POLICY IF EXISTS "Merchants can read own usage records" ON public.usage_records;
CREATE POLICY "Merchants can read own usage records"
    ON public.usage_records
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Merchants can read own monthly usage" ON public.monthly_usage;
CREATE POLICY "Merchants can read own monthly usage"
    ON public.monthly_usage
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());

-- Rate limits table is internal only (service role / security definer functions have access)
DROP POLICY IF EXISTS "Deny direct public access to rate_limits" ON public.rate_limits;
CREATE POLICY "Deny direct public access to rate_limits"
    ON public.rate_limits
    FOR ALL
    TO anon, authenticated
    USING (false);

-- 10. Grants
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_merchant_usage TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_merchant_usage TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_usage_event TO anon, authenticated, service_role;
