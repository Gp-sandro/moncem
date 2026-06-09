import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isUserEmailVerified } from '@/lib/auth';

// NOTE: /feed, /p (dispatches) and /u (profiles) are intentionally public so
// they are crawlable and unfurlable. Reading is open; writing/reacting/messaging
// still gate at the component and API layer.
const protectedPathPrefixes = [
  '/connect',
  '/post',
  '/settings',
  '/me',
  '/inbox',
  '/notifications',
  '/sparked',
  '/admin',
];

const authPathPrefixes = ['/login', '/signup'];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && matchesPrefix(pathname, protectedPathPrefixes)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/join';
    redirectUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && matchesPrefix(pathname, protectedPathPrefixes) && !isUserEmailVerified(user)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/verify-email';
    redirectUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && matchesPrefix(pathname, authPathPrefixes)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isUserEmailVerified(user) ? '/feed' : '/verify-email';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
