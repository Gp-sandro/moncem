-- ─── 003_reactions_fk_fix.sql ────────────────────────────────────────────────
-- reactions.user_id was FK → auth.users(id), which is cross-schema and
-- invisible to PostgREST's join resolver. Re-point it to public.profiles(id).
--
-- Cascade chain is fully preserved:
--   DELETE auth user → cascade to profiles → cascade to reactions
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_user_id_fkey;

ALTER TABLE public.reactions
  ADD CONSTRAINT reactions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;
