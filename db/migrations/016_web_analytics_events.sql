-- Migration 016: first-party web analytics for beta learning
-- Stores product events without IP addresses, raw emails, passwords, or message/post bodies.

CREATE TABLE IF NOT EXISTS public.web_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_id text,
  session_id text,
  event_name text NOT NULL,
  path text,
  referrer text,
  user_agent text,
  duration_ms integer,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT web_analytics_event_name_format
    CHECK (event_name ~ '^[a-z0-9_]{2,80}$'),
  CONSTRAINT web_analytics_duration_nonnegative
    CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

ALTER TABLE public.web_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web_analytics_insert_anon" ON public.web_analytics_events;
CREATE POLICY "web_analytics_insert_anon"
  ON public.web_analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "web_analytics_insert_authenticated" ON public.web_analytics_events;
CREATE POLICY "web_analytics_insert_authenticated"
  ON public.web_analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- No SELECT policy is intentionally created. Analytics are read from the Supabase dashboard
-- or trusted admin tooling only, not by public clients.

CREATE INDEX IF NOT EXISTS web_analytics_events_created_at_idx
  ON public.web_analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS web_analytics_events_event_created_idx
  ON public.web_analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS web_analytics_events_user_created_idx
  ON public.web_analytics_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS web_analytics_events_session_created_idx
  ON public.web_analytics_events (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;
