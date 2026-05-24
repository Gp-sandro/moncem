-- Migration 008: milestone_reached + weekly_digest notification types,
-- plus extending the reaction trigger to fire milestone notifications.

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'post_sparked',
    'post_validated',
    'post_inthis',
    'new_message',
    'new_conversation',
    'new_ask',
    'milestone_reached',
    'weekly_digest'
  ));

-- Replace notify_on_reaction so it ALSO fires a milestone_reached notification
-- when the new sparked count crosses a threshold (10, 25, 50, 100, 250).
-- Counts the reactions table directly so this is independent of trigger ordering
-- vs trg_update_reaction_counts.

CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS trigger AS $$
DECLARE
  post_author        uuid;
  new_count          integer;
  reached_milestone  boolean;
BEGIN
  SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Direct reaction notification (skip if reacting to own post)
  IF post_author != NEW.user_id THEN
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

  -- 2. Milestone notification when sparked count crosses a threshold.
  --    Author gets this even on self-sparks (rare but harmless).
  IF NEW.type = 'sparked' THEN
    SELECT COUNT(*) INTO new_count
    FROM reactions
    WHERE post_id = NEW.post_id AND type = 'sparked';

    reached_milestone := new_count IN (10, 25, 50, 100, 250);

    IF reached_milestone THEN
      INSERT INTO notifications(user_id, type, post_id)
      VALUES (post_author, 'milestone_reached', NEW.post_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
