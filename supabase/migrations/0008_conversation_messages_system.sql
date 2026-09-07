-- Migration: 0008_conversation_messages_system.sql
-- Description: Add updated_at to conversations, add role to conversation_messages, backfill existing messages, and add indexing.

-- 1. Add updated_at column to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Add role column to conversation_messages with check constraint
ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('user', 'assistant', 'system'));

-- 3. Backfill role from sender for any existing messages
UPDATE public.conversation_messages
SET role = CASE
  WHEN sender = 'customer' THEN 'user'
  WHEN sender = 'ai' THEN 'assistant'
  ELSE 'user'
END
WHERE role IS NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_profile_visitor
  ON public.conversations(profile_id, visitor_session_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_created
  ON public.conversation_messages(conversation_id, created_at ASC);

