import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = safeNextPath(requestUrl.searchParams.get('next'));
  const supabase = await createClient();
  const redirectTo = `${requestUrl.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error || !data.url) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('next', next);
    loginUrl.searchParams.set('error', 'google_auth_failed');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(data.url);
}
