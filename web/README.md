# Moncem Web

Student-founder web product for Moncem. The web app shares Supabase with the Expo app and is the first public beta surface.

## Purpose

Moncem web lets student founder stories travel as links, while keeping the high-value product surfaces behind auth during closed beta.

## Local Setup

1. Copy `.env.local.example` to `.env.local`.
2. Fill in the same Supabase URL and anon key used by the mobile app.
3. Run `npm install` from this folder if dependencies are missing.
4. Run `npm run dev -- --port 3000`.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL=https://www.moncem.space`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, required for `/admin/analytics`)
- `ADMIN_EMAILS` (comma-separated admin login emails allowed to open `/admin/analytics`)

Set all public variables in Vercel for Production and Preview. Set the service role key only as a server-side environment variable; never expose it with a `NEXT_PUBLIC_` prefix.

## Public Routes

- `/`
- `/explore`
- `/explore/[tag]`
- `/schools`
- `/schools/[school]`
- `/privacy`
- `/join`
- `/login`
- `/signup`

## Protected Routes

- `/feed`
- `/connect`
- `/post/new`
- `/p/[slug]`
- `/u/[username]`
- `/settings/profile`
- `/inbox`
- `/inbox/[id]`
- `/admin/analytics`

Logged-out users should redirect to `/join?next=...` for every protected route.

## Publish Checklist

1. Run `npm run typecheck`.
2. Run `npm run build`.
3. Deploy a Vercel preview from the `web` root.
4. Add `moncem.space` and `www.moncem.space` as production domains.
5. In Supabase Auth URL configuration, add:
   - `https://www.moncem.space/auth/callback`
   - `https://moncem.space/auth/callback`
   - `http://localhost:3000/auth/callback`
6. In Supabase Auth providers:
   - Enable email confirmations.
   - Enable Google.
   - Configure Google with Supabase callback `https://rczpruplerhxedetjdvn.supabase.co/auth/v1/callback`.
7. Confirm `public.web_analytics_events` exists and RLS is enabled.
8. Add `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` in Vercel if you want the private analytics dashboard.
9. Smoke-test production:
   - Sign up, sign in, sign out.
   - Confirm email/password signup requires email verification.
   - Start Google sign-in.
   - Complete `/settings/profile`.
   - Verify student status with a school email domain.
   - Publish with and without a cover image.
   - React to a post.
   - Start a conversation and reply in `/inbox/[id]`.
   - Confirm logged-out users cannot open protected routes.
   - Confirm `/admin/analytics` redirects non-admins and opens for the admin email.
