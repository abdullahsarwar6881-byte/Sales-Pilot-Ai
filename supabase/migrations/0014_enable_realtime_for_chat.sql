-- Migration: 0014_enable_realtime_for_chat.sql
-- Description: Add conversation_messages and conversations to supabase_realtime publication
-- and configure RLS for public visitor realtime access.

-- 1. Enable REPLICA IDENTITY FULL so Realtime receives complete row data for filters
ALTER TABLE public.conversation_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 3. Add RLS policy allowing anon role to receive messages for conversations with a visitor session
DROP POLICY IF EXISTS "Public visitor can view messages of own conversation" ON public.conversation_messages;
CREATE POLICY "Public visitor can view messages of own conversation"
  ON public.conversation_messages
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_messages.conversation_id
      AND c.visitor_session_id IS NOT NULL
      AND c.profile_id IS NOT NULL
    )
  );

-- 4. Add RLS policy allowing anon role to receive updates for conversations with a visitor session
DROP POLICY IF EXISTS "Public visitor can view own conversation" ON public.conversations;
CREATE POLICY "Public visitor can view own conversation"
  ON public.conversations
  FOR SELECT
  TO anon
  USING (
    visitor_session_id IS NOT NULL
    AND profile_id IS NOT NULL
  );

