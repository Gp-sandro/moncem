-- ─── Migration 004: Onboarding fields + Connect + Conversations ───────────────

-- 1. Extend profiles table

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connect_status       text        NOT NULL DEFAULT 'closed'
    CHECK (connect_status IN ('open', 'limited', 'closed')),
  ADD COLUMN IF NOT EXISTS building_stage       text
    CHECK (building_stage IN ('idea', 'mvp', 'launched', 'scaling')),
  ADD COLUMN IF NOT EXISTS location             text,
  ADD COLUMN IF NOT EXISTS interests            text[]      NOT NULL DEFAULT '{}';

-- Backfill: mark existing onboarded profiles as onboarding_completed
UPDATE public.profiles SET onboarding_completed = true WHERE onboarded = true;

-- 2. Conversations table

CREATE TABLE IF NOT EXISTS public.conversations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids  uuid[]      NOT NULL,
  context_post_id  uuid        REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_message_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_participant_ids_idx
  ON public.conversations USING GIN (participant_ids);

-- 3. Messages table

CREATE TABLE IF NOT EXISTS public.messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body             text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx
  ON public.messages (conversation_id, created_at);

-- 4. RLS for conversations

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "conversations_insert_participant"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- 5. RLS for messages

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND auth.uid() = ANY(c.participant_ids)
    )
  );

CREATE POLICY "messages_insert_sender"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND auth.uid() = ANY(c.participant_ids)
    )
  );

-- 6. Trigger: update last_message_at on conversations when a message is inserted

CREATE OR REPLACE FUNCTION public.trg_update_last_message_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_message_at ON public.messages;
CREATE TRIGGER trg_update_last_message_at
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_last_message_at();

-- 7. RPC: start_conversation(recipient_id, context_post_id, first_message)
-- Finds or creates the conversation, inserts the first message, returns conversation id.

CREATE OR REPLACE FUNCTION public.start_conversation(
  recipient_id    uuid,
  context_post_id uuid DEFAULT NULL,
  first_message   text DEFAULT ''
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id     uuid := auth.uid();
  v_conversation  uuid;
  v_participants  uuid[];
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller_id = recipient_id THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  -- Stable participant ordering so we always find the same row
  v_participants := ARRAY[
    LEAST(v_caller_id, recipient_id),
    GREATEST(v_caller_id, recipient_id)
  ];

  -- Look for an existing conversation between these two participants
  SELECT id INTO v_conversation
  FROM public.conversations
  WHERE participant_ids = v_participants
  LIMIT 1;

  -- Create one if it doesn't exist
  IF v_conversation IS NULL THEN
    INSERT INTO public.conversations (participant_ids, context_post_id)
    VALUES (v_participants, context_post_id)
    RETURNING id INTO v_conversation;
  END IF;

  -- Insert the first message only when body is non-empty
  IF first_message IS NOT NULL AND char_length(trim(first_message)) > 0 THEN
    INSERT INTO public.messages (conversation_id, sender_id, body)
    VALUES (v_conversation, v_caller_id, trim(first_message));
  END IF;

  RETURN v_conversation;
END;
$$;
