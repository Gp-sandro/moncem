-- ─── 002_sparks.sql ───────────────────────────────────────────────────────────
-- Replaces the saves table with a Sparks reactions system.
-- Three reaction types: sparked | validated | inthis
-- Denormalized counts on posts for O(1) feed reads.
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Drop old saves table (cascade removes dependent RLS policies)
DROP TABLE IF EXISTS public.saves CASCADE;

-- 2. Create reactions table
CREATE TABLE public.reactions (
  user_id   uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id   uuid    NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  type      text    NOT NULL CHECK (type IN ('sparked', 'validated', 'inthis')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id, type)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_all"
  ON public.reactions FOR SELECT USING (true);

CREATE POLICY "reactions_insert_own"
  ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete_own"
  ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- 3. Add denormalized count columns to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS sparked_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validated_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inthis_count    integer NOT NULL DEFAULT 0;

-- 4. Trigger: keep counts in sync on reactions INSERT / DELETE
CREATE OR REPLACE FUNCTION public.update_reaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  col text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    col := NEW.type || '_count';
    EXECUTE format(
      'UPDATE public.posts SET %I = %I + 1 WHERE id = $1',
      col, col
    ) USING NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    col := OLD.type || '_count';
    EXECUTE format(
      'UPDATE public.posts SET %I = GREATEST(%I - 1, 0) WHERE id = $1',
      col, col
    ) USING OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_reaction_counts ON public.reactions;
CREATE TRIGGER trg_update_reaction_counts
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_reaction_counts();

-- 5. Index for fast "posts sparked by user" lookup (SPARKED tab)
CREATE INDEX IF NOT EXISTS reactions_user_type_idx
  ON public.reactions (user_id, type, created_at DESC);

-- 6. Index for recent sparkers social proof (last 3 avatars)
CREATE INDEX IF NOT EXISTS reactions_post_type_idx
  ON public.reactions (post_id, type, created_at DESC);
