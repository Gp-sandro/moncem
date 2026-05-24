-- DB-level rate limiting functions.
-- These are called from lib/queries.ts before INSERT operations.
-- SECURITY DEFINER so they bypass RLS to count the user's own rows.
-- Limits: 10 posts/hr, 30 messages/hr, 5 new conversations/day.

CREATE OR REPLACE FUNCTION public.check_post_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE post_count integer;
BEGIN
  SELECT COUNT(*) INTO post_count FROM public.posts
  WHERE author_id = p_user_id AND created_at > now() - interval '1 hour';
  RETURN post_count < 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_message_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE msg_count integer;
BEGIN
  SELECT COUNT(*) INTO msg_count FROM public.messages
  WHERE sender_id = p_user_id AND created_at > now() - interval '1 hour';
  RETURN msg_count < 30;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_conversation_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE conv_count integer;
BEGIN
  SELECT COUNT(*) INTO conv_count FROM public.conversations
  WHERE participant_ids @> ARRAY[p_user_id] AND created_at > now() - interval '24 hours';
  RETURN conv_count < 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_post_rate_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_message_rate_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_conversation_rate_limit(uuid) TO authenticated;
