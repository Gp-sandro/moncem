-- Input validation CHECK constraints
-- Applied 2026-04-30 via Supabase Management API

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_full_name_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_full_name_length
      CHECK (full_name IS NULL OR char_length(full_name) <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_bio_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length
      CHECK (bio IS NULL OR char_length(bio) <= 300);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_title_length') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_title_length
      CHECK (char_length(title) BETWEEN 1 AND 150);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_body_length') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_body_length
      CHECK (body IS NULL OR char_length(body) <= 10000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_tags_count') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_tags_count
      CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_milestone_length') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_milestone_length
      CHECK (milestone IS NULL OR char_length(milestone) <= 150);
  END IF;
END;
$$;
