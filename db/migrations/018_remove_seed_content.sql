-- 018_remove_seed_content.sql
--
-- Part 1.1 of the beta hardening pass: remove all "Example Builder" seed
-- accounts and everything attached to them, strip picsum.photos placeholder
-- covers from the surviving real posts, and clear the placeholder
-- "Moncem Beta" school entry.
--
-- Seed accounts removed (usernames):
--   example_lina, example_niko, example_amara, example_david, example_elias
-- These five profiles own the 6 "Example dispatch" posts currently in the feed.
-- Real content kept untouched: the three Sandro Kashibadze dispatches and the
-- @admin ops account (its placeholder "Moncem Beta" school is just blanked).
--
-- REVERSIBILITY
-- Before deleting, the affected auth.users / profiles / posts rows are copied
-- into seed_cleanup_backup_* tables. A commented rollback block at the bottom
-- restores them. After you have confirmed the cleanup is correct in production
-- you may drop the backup tables (see the final, also-commented, cleanup line).
--
-- Run as the postgres/service role (Supabase SQL editor): deleting from
-- auth.users requires elevated privileges.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Resolve the target account ids once.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _seed_targets ON COMMIT DROP AS
  SELECT id
  FROM public.profiles
  WHERE username IN (
    'example_lina', 'example_niko', 'example_amara', 'example_david', 'example_elias'
  );

-- ---------------------------------------------------------------------------
-- 1. Back up the rows we are about to delete (reversibility).
--    SELECT * preserves every column, including auth credentials, so a full
--    restore is possible.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seed_cleanup_backup_auth_users AS
  SELECT * FROM auth.users WHERE false;
CREATE TABLE IF NOT EXISTS public.seed_cleanup_backup_profiles AS
  SELECT * FROM public.profiles WHERE false;
CREATE TABLE IF NOT EXISTS public.seed_cleanup_backup_posts AS
  SELECT * FROM public.posts WHERE false;

INSERT INTO public.seed_cleanup_backup_auth_users
  SELECT * FROM auth.users WHERE id IN (SELECT id FROM _seed_targets);
INSERT INTO public.seed_cleanup_backup_profiles
  SELECT * FROM public.profiles WHERE id IN (SELECT id FROM _seed_targets);
INSERT INTO public.seed_cleanup_backup_posts
  SELECT * FROM public.posts WHERE author_id IN (SELECT id FROM _seed_targets);

-- ---------------------------------------------------------------------------
-- 2. Delete the seed accounts.
--    Every dependent table references profiles(id) ON DELETE CASCADE
--    (posts, reactions, notifications, reports, beta_feedback,
--     web_analytics_events, messages, ...), and profiles.id references
--    auth.users(id) ON DELETE CASCADE. Removing the auth user therefore
--    removes the profile and all of its content in one statement.
-- ---------------------------------------------------------------------------
DELETE FROM auth.users WHERE id IN (SELECT id FROM _seed_targets);

-- Defensive: if the profiles -> auth.users cascade is ever missing, this
-- still removes the profile rows (and their cascaded content).
DELETE FROM public.profiles WHERE id IN (SELECT id FROM _seed_targets);

-- ---------------------------------------------------------------------------
-- 3. Strip picsum.photos placeholder covers from any surviving real posts.
--    (One real Sandro dispatch currently uses a picsum seed image.)
-- ---------------------------------------------------------------------------
UPDATE public.posts
SET cover_url = NULL
WHERE cover_url LIKE 'https://picsum.photos/%';

-- ---------------------------------------------------------------------------
-- 4. Remove the placeholder "Moncem Beta" school entry. The @admin ops
--    account keeps existing; only its fake school string is cleared so it
--    stops showing up as a real school.
-- ---------------------------------------------------------------------------
UPDATE public.profiles
SET school = NULL
WHERE school = 'Moncem Beta';

COMMIT;

-- ===========================================================================
-- ROLLBACK (run manually to undo this migration; requires the backup tables
-- created above to still exist):
--
-- BEGIN;
--   INSERT INTO auth.users      SELECT * FROM public.seed_cleanup_backup_auth_users
--     ON CONFLICT (id) DO NOTHING;
--   INSERT INTO public.profiles SELECT * FROM public.seed_cleanup_backup_profiles
--     ON CONFLICT (id) DO NOTHING;
--   INSERT INTO public.posts    SELECT * FROM public.seed_cleanup_backup_posts
--     ON CONFLICT (id) DO NOTHING;
--   -- Note: picsum covers and the "Moncem Beta" school string are NOT restored
--   -- automatically (they were placeholders); restore manually if ever needed.
-- COMMIT;
--
-- Once the cleanup is verified in production and no rollback is needed:
--   DROP TABLE IF EXISTS public.seed_cleanup_backup_auth_users;
--   DROP TABLE IF EXISTS public.seed_cleanup_backup_profiles;
--   DROP TABLE IF EXISTS public.seed_cleanup_backup_posts;
-- ===========================================================================
