-- Migration: 0017_crawl_jobs_enhancement.sql
-- Description: Add persistent crawl progress, ETA, and activity tracking columns to public.crawl_jobs

ALTER TABLE public.crawl_jobs
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS crawled_pages integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_pages integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS estimated_total_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elapsed_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_seconds integer,
  ADD COLUMN IF NOT EXISTS current_page_title text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill website_url from url if missing
UPDATE public.crawl_jobs
SET website_url = url
WHERE website_url IS NULL AND url IS NOT NULL;

-- Backfill crawled_pages from pages_completed if missing
UPDATE public.crawl_jobs
SET crawled_pages = pages_completed
WHERE crawled_pages = 0 AND pages_completed > 0;

-- Performance indexes for active job and user job queries
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_user_status
  ON public.crawl_jobs (user_id, status);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_user_created
  ON public.crawl_jobs (user_id, created_at DESC);

-- Enable full replica identity for Realtime updates
ALTER TABLE public.crawl_jobs REPLICA IDENTITY FULL;

-- Add crawl_jobs to supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crawl_jobs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

