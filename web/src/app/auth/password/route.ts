import { NextResponse, type NextRequest } from 'next/server';
import { isUserEmailVerified, safeNextPath } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

type AuthMode = 'login' | 'signup';

type PasswordAuthBody = {
  mode?: AuthMode;
  email?: string;
  password?: string;
  fullName?: string;
  username?: string;
  school?: string;
  currentProject?: string;
  nextPath?: string;
};

const maxAuthRequestBytes = 5_000;

function isAuthMode(value: unknown): value is AuthMode {
  return value === 'login' || value === 'signup';
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const source = origin ?? referer;
  if (!source) return false;

  try {
    return new URL(source).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

function cleanOptional(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return null;
  return username;
}

function mapUnexpectedAuthError(error: unknown): string {
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    const cause = error.cause as { code?: string; hostname?: string } | undefined;

    if (cause?.code === 'ENOTFOUND') {
      return `Could not resolve ${cause.hostname ?? 'the Supabase project host'}. Check that the Supabase project is active and that NEXT_PUBLIC_SUPABASE_URL points to the current project URL.`;
    }

    return 'Could not reach Supabase from the web server. Check your internet connection and Supabase URL, then restart the dev server.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Authentication failed. Please try again.';
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This auth request was blocked. Refresh the page and try again.', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxAuthRequestBytes) {
    return jsonError('Auth request is too large.', 413);
  }

  let body: PasswordAuthBody;

  try {
    body = (await request.json()) as PasswordAuthBody;
  } catch {
    return jsonError('Invalid auth request.', 400);
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const fullName = cleanOptional(body.fullName, 100);
  const username = cleanUsername(body.username);
  const school = cleanOptional(body.school, 120);
  const currentProject = cleanOptional(body.currentProject, 160);
  const next = safeNextPath(typeof body.nextPath === 'string' ? body.nextPath : null);

  if (!isAuthMode(body.mode)) {
    return jsonError('Invalid auth mode.', 400);
  }

  if (!email || !password) {
    return jsonError('Email and password are required.', 400);
  }

  if (body.mode === 'signup') {
    if (!fullName) {
      return jsonError('Add your full name before joining.', 400);
    }

    if (!username) {
      return jsonError('Choose a username with 3-30 lowercase letters, numbers, or underscores.', 400);
    }
  }

  try {
    const supabase = await createClient();

    if (body.mode === 'signup') {
      const { data: allowed, error: rateError } = await supabase.rpc('check_signup_rate_limit', {
        email_attempt: email,
      });

      if (rateError) {
        console.error('Signup rate-limit check failed', rateError);
        return jsonError('Could not verify signup limits. Try again in a minute.', 400);
      }

      if (allowed === false) {
        return jsonError('Too many signup attempts for this email. Try again later.', 429);
      }
    }

    const result =
      body.mode === 'signup'
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(next)}`,
              data: {
                full_name: fullName,
                name: fullName,
                username,
                preferred_username: username,
                school,
                current_project: currentProject,
              },
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      return jsonError(result.error.message, 400);
    }

    if (body.mode === 'signup' && !result.data.session) {
      return NextResponse.json(
        { ok: true, needsEmailConfirmation: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (result.data.user && !isUserEmailVerified(result.data.user)) {
      await supabase.auth.signOut();
      return jsonError('Confirm your email before signing in.', 403);
    }

    if (result.data.user) {
      await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('id', result.data.user.id);
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(mapUnexpectedAuthError(error), 503);
  }
}
