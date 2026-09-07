-- Migration: 0013_fix_rpc_msg_id_type.sql
-- Description: Fix v_msg_id type in takeover, return_to_ai, and resolve functions from uuid to bigint (matching conversation_messages.id)

-- 1. Atomic takeover function
CREATE OR REPLACE FUNCTION public.take_over_conversation(
  p_conversation_id bigint,
  p_user_id uuid,
  p_agent_name text DEFAULT 'Support Agent'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv record;
  v_msg_id bigint;
  v_sender_name text;
BEGIN
  -- 1. Lock conversation row exclusively to prevent race conditions
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conversation not found',
      'code', 'NOT_FOUND'
    );
  END IF;

  -- 2. Multi-tenant security check: ensure caller belongs to this merchant profile
  IF v_conv.profile_id != p_user_id AND (v_conv.user_id IS NULL OR v_conv.user_id != p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized tenant access',
      'code', 'FORBIDDEN'
    );
  END IF;

  -- 3. Check if already taken over by another human agent
  IF v_conv.assigned_to IS NOT NULL 
     AND v_conv.assigned_to NOT IN ('ai', 'waiting_for_human', '')
     AND v_conv.assigned_to != p_user_id::text THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conversation has already been taken over by another agent',
      'code', 'ALREADY_ASSIGNED',
      'assigned_to', v_conv.assigned_to
    );
  END IF;

  v_sender_name := COALESCE(NULLIF(trim(p_agent_name), ''), 'Support Agent');

  -- 4. Atomically update conversation
  UPDATE public.conversations
  SET
    status = 'human_active',
    assigned_to = p_user_id::text,
    taken_over_at = now(),
    taken_over_by = p_user_id,
    human_joined_at = COALESCE(human_joined_at, now()),
    updated_at = now()
  WHERE id = p_conversation_id;

  -- 5. Insert audit / system announcement message
  INSERT INTO public.conversation_messages (
    conversation_id,
    sender,
    role,
    content,
    created_at
  ) VALUES (
    p_conversation_id,
    'system',
    'system',
    v_sender_name || ' has joined the conversation',
    now()
  ) RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'assigned_to', p_user_id::text,
    'status', 'human_active',
    'system_message_id', v_msg_id,
    'taken_over_at', now()
  );
END;
$$;

-- 2. Atomic return to AI function
CREATE OR REPLACE FUNCTION public.return_conversation_to_ai(
  p_conversation_id bigint,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv record;
  v_msg_id bigint;
BEGIN
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conversation not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_conv.profile_id != p_user_id AND (v_conv.user_id IS NULL OR v_conv.user_id != p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized tenant access', 'code', 'FORBIDDEN');
  END IF;

  UPDATE public.conversations
  SET
    status = 'ai_active',
    assigned_to = 'ai',
    updated_at = now()
  WHERE id = p_conversation_id;

  INSERT INTO public.conversation_messages (
    conversation_id,
    sender,
    role,
    content,
    created_at
  ) VALUES (
    p_conversation_id,
    'system',
    'system',
    'Conversation returned to AI assistant',
    now()
  ) RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'status', 'ai_active',
    'assigned_to', 'ai',
    'system_message_id', v_msg_id
  );
END;
$$;

-- 3. Atomic resolve conversation function
CREATE OR REPLACE FUNCTION public.resolve_conversation(
  p_conversation_id bigint,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv record;
  v_msg_id bigint;
BEGIN
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conversation not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_conv.profile_id != p_user_id AND (v_conv.user_id IS NULL OR v_conv.user_id != p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized tenant access', 'code', 'FORBIDDEN');
  END IF;

  UPDATE public.conversations
  SET
    status = 'resolved',
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_conversation_id;

  INSERT INTO public.conversation_messages (
    conversation_id,
    sender,
    role,
    content,
    created_at
  ) VALUES (
    p_conversation_id,
    'system',
    'system',
    'Conversation resolved',
    now()
  ) RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'status', 'resolved',
    'resolved_at', now(),
    'system_message_id', v_msg_id
  );
END;
$$;

