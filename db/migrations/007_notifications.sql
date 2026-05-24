-- Migration 007: Notifications table + triggers

CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type            text CHECK (type IN (
                    'post_sparked',
                    'post_validated',
                    'post_inthis',
                    'new_message',
                    'new_conversation',
                    'new_ask'
                  )) NOT NULL,
  actor_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  post_id         uuid REFERENCES posts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  read            boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON notifications(user_id, read)
  WHERE read = false;

-- Push token column on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;

-- ─── Trigger: reaction INSERT → notify post author ────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS trigger AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
  -- Never notify the person who reacted on their own post
  IF post_author IS NOT NULL AND post_author != NEW.user_id THEN
    INSERT INTO notifications(user_id, type, actor_id, post_id)
    VALUES (
      post_author,
      CASE NEW.type
        WHEN 'sparked'   THEN 'post_sparked'
        WHEN 'validated' THEN 'post_validated'
        WHEN 'inthis'    THEN 'post_inthis'
      END,
      NEW.user_id,
      NEW.post_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS reaction_notification ON reactions;
CREATE TRIGGER reaction_notification
  AFTER INSERT ON reactions
  FOR EACH ROW EXECUTE FUNCTION notify_on_reaction();

-- ─── Trigger: message INSERT → notify other participant ───────────────────────

CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS trigger AS $$
DECLARE
  recipient uuid;
BEGIN
  -- conversations uses participant_ids uuid[] — find the non-sender
  SELECT pid INTO recipient
  FROM conversations c,
       LATERAL UNNEST(c.participant_ids) pid
  WHERE c.id = NEW.conversation_id
    AND pid != NEW.sender_id
  LIMIT 1;

  IF recipient IS NOT NULL THEN
    INSERT INTO notifications(user_id, type, actor_id, conversation_id)
    VALUES (recipient, 'new_message', NEW.sender_id, NEW.conversation_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS message_notification ON messages;
CREATE TRIGGER message_notification
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();
