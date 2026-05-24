-- Migration 013: Student founder web pivot support

-- 1. Student-founder profile fields for public web discovery.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS major text,
  ADD COLUMN IF NOT EXISTS student_status text,
  ADD COLUMN IF NOT EXISTS current_project text,
  ADD COLUMN IF NOT EXISTS accelerator text,
  ADD COLUMN IF NOT EXISTS edu_email_verified boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_student_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_student_status_check
      CHECK (
        student_status IS NULL OR student_status IN (
          'high_school',
          'undergrad',
          'grad',
          'recently_graduated',
          'gap_year',
          'dropped_out'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_current_project_length'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_current_project_length
      CHECK (current_project IS NULL OR char_length(current_project) <= 160);
  END IF;
END;
$$;

-- 2. Stable public post URLs.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
    trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_post_slug(base_title text, existing_post_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix int := 0;
BEGIN
  base_slug := coalesce(public.slugify_text(base_title), 'student-founder-story');
  base_slug := substr(base_slug, 1, 72);
  candidate := base_slug;

  WHILE EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.slug = candidate
      AND (existing_post_id IS NULL OR p.id <> existing_post_id)
  ) LOOP
    suffix := suffix + 1;
    candidate := substr(base_slug, 1, 66) || '-' || suffix;
  END LOOP;

  RETURN candidate;
END;
$$;

UPDATE public.posts
SET slug = public.generate_unique_post_slug(title, id)
WHERE slug IS NULL OR slug = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_slug_unique'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_slug_unique UNIQUE (slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_slug_format'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_slug_format
      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_post_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_unique_post_slug(NEW.title, NEW.id);
  ELSE
    NEW.slug := public.generate_unique_post_slug(NEW.slug, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_post_slug ON public.posts;
CREATE TRIGGER trg_set_post_slug
  BEFORE INSERT OR UPDATE OF title, slug ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_post_slug();

-- 3. Keep own-profile RPC current for settings/profile editing.
DROP FUNCTION IF EXISTS public.get_own_profile();

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
  school text,
  major text,
  student_status text,
  current_project text,
  accelerator text,
  edu_email_verified boolean,
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
    p.school,
    p.major,
    p.student_status,
    p.current_project,
    p.accelerator,
    p.edu_email_verified,
    p.created_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

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
  school,
  major,
  student_status,
  current_project,
  accelerator,
  edu_email_verified,
  created_at
) ON public.profiles TO authenticated;

-- 4. Public-safe web views. These intentionally expose only fields meant for public discovery.
CREATE OR REPLACE VIEW public.public_profiles_web AS
SELECT
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.location,
  p.connect_status,
  p.building_stage,
  p.interests,
  p.school,
  p.major,
  p.student_status,
  p.current_project,
  p.accelerator,
  p.edu_email_verified,
  p.created_at
FROM public.profiles p
WHERE coalesce(p.onboarding_completed, p.onboarded, false) = true;

CREATE OR REPLACE VIEW public.public_posts_web AS
SELECT
  po.id,
  po.slug,
  po.type,
  po.title,
  po.excerpt,
  po.body,
  po.cover_url,
  po.milestone,
  po.tags,
  po.view_count,
  po.sparked_count,
  po.validated_count,
  po.inthis_count,
  po.created_at,
  pr.id AS author_id,
  pr.username AS author_username,
  pr.full_name AS author_full_name,
  pr.avatar_url AS author_avatar_url,
  pr.bio AS author_bio,
  pr.location AS author_location,
  pr.connect_status AS author_connect_status,
  pr.building_stage AS author_building_stage,
  pr.interests AS author_interests,
  pr.school AS author_school,
  pr.major AS author_major,
  pr.student_status AS author_student_status,
  pr.current_project AS author_current_project,
  pr.accelerator AS author_accelerator,
  pr.edu_email_verified AS author_edu_email_verified,
  pr.created_at AS author_created_at
FROM public.posts po
JOIN public.profiles pr ON pr.id = po.author_id
WHERE coalesce(pr.onboarding_completed, pr.onboarded, false) = true;

GRANT SELECT ON public.public_profiles_web TO anon, authenticated;
GRANT SELECT ON public.public_posts_web TO anon, authenticated;
