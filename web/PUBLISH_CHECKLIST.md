# Moncem Web Publish Checklist

## Vercel

- Project root directory: `web`
- Build command: `npm run build`
- Install command: `npm install`
- Output: Next.js default
- Production domains: `www.moncem.space` and `moncem.space`
- Canonical site URL: `https://www.moncem.space`

## Environment Variables

Set these in Vercel for Production and Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL=https://www.moncem.space`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, for admin analytics)
- `ADMIN_EMAILS=you@example.com` (comma-separated admin emails)

## Supabase Auth

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://www.moncem.space`
- Redirect URL: `https://www.moncem.space/auth/callback`
- Redirect URL for bare domain: `https://moncem.space/auth/callback`
- Redirect URL for local testing: `http://localhost:3000/auth/callback`

In Supabase Dashboard -> Authentication -> Providers:

- Enable Email provider.
- Enable Confirm email for email/password signups.
- Enable Google provider.
- Add the Google OAuth client ID and secret from Google Cloud Console.
- Google redirect/callback URL in Google Cloud must include:
  - `https://rczpruplerhxedetjdvn.supabase.co/auth/v1/callback`

## Supabase Backend Dependencies

Verify production has:

- Tables: `posts`, `profiles`, `reactions`, `conversations`, `messages`
- Views: `public_posts_web`, `public_profiles_web`
- RPCs: `get_own_profile`, `check_post_rate_limit`, `check_message_rate_limit`, `check_conversation_rate_limit`, `start_conversation`
- Storage bucket: `covers`
- Storage path format: `{auth.uid()}/{uuid}/cover.{ext}`
- Analytics table: `web_analytics_events`

## Closed Beta Access Rules

Public:

- `/`
- `/explore`
- `/explore/[tag]`
- `/schools`
- `/schools/[school]`
- `/privacy`
- `/join`
- `/login`
- `/signup`

Protected:

- `/feed`
- `/connect`
- `/post/new`
- `/p/[slug]`
- `/u/[username]`
- `/settings/profile`
- `/inbox`
- `/inbox/[id]`
- `/admin/analytics`

## Final Smoke Test

- Logged out user can browse public pages.
- Logged out user is redirected from protected pages to `/join?next=...`.
- User can sign up and complete profile.
- Email/password signup shows a check-your-email state.
- Google sign-in starts through `/auth/oauth/google`.
- User can publish a post.
- User can upload a cover image.
- User can react to a post and refresh without losing state.
- User can start a conversation from Connect, Profile, and Post detail.
- User can reply in Inbox.
- User cannot open another user's conversation by guessing the URL.
- `/robots.txt` excludes protected routes.
- `/sitemap.xml` includes public routes only.
- Analytics events appear in `public.web_analytics_events`.
- `/admin/analytics` opens only for emails listed in `ADMIN_EMAILS`.
