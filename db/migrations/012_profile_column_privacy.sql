-- Migration 012: Profile column privacy and live post insert rate-limit policy

CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  interests text[],
  onboarded boolean,
  onboarding_completed boolean,
  email_verified boolean,
  connect_status text,
  building_stage text,
  location text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.interests,
    p.onboarded,
    p.onboarding_completed,
    p.email_verified,
    p.connect_status,
    p.building_stage,
    p.location,
    p.created_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id,
  username,
  full_name,
  avatar_url,
  bio,
  location,
  connect_status,
  building_stage,
  interests,
  created_at
) ON public.profiles TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'posts'
      AND policyname = 'insert own post'
  ) THEN
    ALTER POLICY "insert own post" ON public.posts
      WITH CHECK (
        auth.uid() = author_id
        AND public.check_post_rate_limit(auth.uid())
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'posts'
      AND policyname = 'posts_insert_own'
  ) THEN
    ALTER POLICY "posts_insert_own" ON public.posts
      WITH CHECK (
        author_id = auth.uid()
        AND public.check_post_rate_limit(auth.uid())
      );
  END IF;
END;
$$;
