-- Migration 011: Social auth, account deletion, rate limits, and storage privacy

-- 1. Username generation for auth-trigger profile creation.
CREATE OR REPLACE FUNCTION public.generate_unique_username(base_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned text;
  candidate text;
  suffix int := 0;
BEGIN
  cleaned := lower(regexp_replace(coalesce(base_name, ''), '[^a-z0-9_]', '', 'gi'));
  cleaned := nullif(substr(cleaned, 1, 25), '');
  candidate := coalesce(cleaned, 'builder');

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    suffix := suffix + 1;
    candidate := substr(coalesce(cleaned, 'builder'), 1, 22) || '_' || suffix;
  END LOOP;

  RETURN candidate;
END;
$$;

-- 2. Auth trigger that safely handles email, Google, and Apple sign-in metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user_with_social()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  resolved_name text;
  resolved_avatar text;
  provider_name text;
BEGIN
  provider_name := coalesce(NEW.app_metadata->>'provider', '');
  base_username := coalesce(
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(coalesce(NEW.email, ''), '@', 1),
    'builder'
  );
  resolved_name := nullif(coalesce(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    nullif(trim(concat(
      coalesce(NEW.raw_user_meta_data->>'given_name', ''),
      ' ',
      coalesce(NEW.raw_user_meta_data->>'family_name', '')
    )), '')
  ), '');
  resolved_avatar := coalesce(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    email_verified
  ) VALUES (
    NEW.id,
    public.generate_unique_username(base_username),
    coalesce(resolved_name, public.generate_unique_username(base_username)),
    resolved_avatar,
    CASE
      WHEN provider_name IN ('google', 'apple') THEN true
      WHEN NEW.email_confirmed_at IS NOT NULL THEN true
      ELSE false
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = EXCLUDED.email_verified,
    avatar_url = coalesce(public.profiles.avatar_url, EXCLUDED.avatar_url),
    full_name = coalesce(nullif(public.profiles.full_name, ''), EXCLUDED.full_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_with_social ON auth.users;

CREATE TRIGGER on_auth_user_created_with_social
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_social();

-- 3. Keep email_verified in sync when Supabase confirms an email later.
CREATE OR REPLACE FUNCTION public.sync_profile_email_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at THEN
    UPDATE public.profiles
    SET email_verified = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email_verified();

-- 4. Database-level rate limits.
CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(email_attempt text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT count(*) INTO recent_count
  FROM auth.users
  WHERE email = email_attempt
    AND created_at > now() - interval '1 hour';

  RETURN recent_count < 3;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_post_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.posts
  WHERE author_id = p_user_id
    AND created_at > now() - interval '1 hour';

  RETURN recent_count < 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_message_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.messages
  WHERE sender_id = p_user_id
    AND created_at > now() - interval '1 hour';

  RETURN recent_count < 30;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_signup_rate_limit(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_post_rate_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_message_rate_limit(uuid) TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'messages_insert_sender'
  ) THEN
    ALTER POLICY "messages_insert_sender" ON public.messages
      WITH CHECK (
        sender_id = auth.uid()
        AND public.check_message_rate_limit(auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.id = conversation_id
            AND auth.uid() = ANY(c.participant_ids)
        )
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

-- 5. Account deletion cascade hardening.
ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_user_id_fkey,
  ADD CONSTRAINT reactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
    ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_profile_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.conversations
  WHERE OLD.id = ANY(participant_ids);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS delete_profile_conversations ON public.profiles;
CREATE TRIGGER delete_profile_conversations
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.delete_profile_conversations();

-- 6. Covers bucket ownership policies.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "covers_select_public" ON storage.objects;
CREATE POLICY "covers_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers_insert_own_path" ON storage.objects;
CREATE POLICY "covers_insert_own_path"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "covers_update_own_path" ON storage.objects;
CREATE POLICY "covers_update_own_path"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "covers_delete_own_path" ON storage.objects;
CREATE POLICY "covers_delete_own_path"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. Audit helper queries to run after applying this migration.
-- FK cascade audit:
-- SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table,
--        ccu.column_name AS foreign_column, rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints rc
--   ON tc.constraint_name = rc.constraint_name
-- JOIN information_schema.constraint_column_usage ccu
--   ON rc.unique_constraint_name = ccu.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND (ccu.table_name = 'profiles' OR ccu.table_name = 'users');
