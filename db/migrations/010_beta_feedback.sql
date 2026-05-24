-- Migration 010: In-app beta feedback

CREATE TABLE IF NOT EXISTS beta_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 5 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_feedback_insert_own" ON beta_feedback;
CREATE POLICY "beta_feedback_insert_own" ON beta_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "beta_feedback_select_own" ON beta_feedback;
CREATE POLICY "beta_feedback_select_own" ON beta_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS beta_feedback_user_created
  ON beta_feedback(user_id, created_at DESC);
