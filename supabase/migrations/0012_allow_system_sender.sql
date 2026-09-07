-- Migration: 0012_allow_system_sender.sql
-- Description: Update conversation_messages sender constraint to allow 'system' alongside 'customer', 'ai', 'human'

DO $$
BEGIN
  ALTER TABLE public.conversation_messages DROP CONSTRAINT IF EXISTS sender_check;
  
  ALTER TABLE public.conversation_messages 
    ADD CONSTRAINT sender_check CHECK (sender IN ('customer', 'ai', 'human', 'system'));
END $$;

