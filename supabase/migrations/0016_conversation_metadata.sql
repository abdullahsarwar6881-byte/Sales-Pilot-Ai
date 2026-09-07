-- Migration: 0016_conversation_metadata.sql
-- Description: Add metadata jsonb column to public.conversations to support persistent, serverless-safe session context (such as verified order tracking context).

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Performance index for metadata queries when present
CREATE INDEX IF NOT EXISTS idx_conversations_metadata
  ON public.conversations USING gin (metadata);

