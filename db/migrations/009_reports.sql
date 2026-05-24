-- Migration 009: Minimal beta reporting

CREATE TABLE IF NOT EXISTS reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post', 'profile')),
  post_id     uuid REFERENCES posts(id) ON DELETE CASCADE,
  profile_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (reason IN ('spam', 'harassment', 'misleading', 'unsafe', 'other')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_exactly_one_target CHECK (
    (target_type = 'post' AND post_id IS NOT NULL AND profile_id IS NULL)
    OR
    (target_type = 'profile' AND profile_id IS NOT NULL AND post_id IS NULL)
  ),
  CONSTRAINT reports_not_self_profile CHECK (
    target_type != 'profile' OR profile_id != reporter_id
  )
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS reports_reporter_created
  ON reports(reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reports_post_target
  ON reports(post_id)
  WHERE post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reports_profile_target
  ON reports(profile_id)
  WHERE profile_id IS NOT NULL;
