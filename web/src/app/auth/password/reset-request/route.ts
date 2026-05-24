import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { createClient } from '@/lib/supabase/server';

type ResetRequestBody = {
  email?: string;
};

const maxRequestBytes = 2_000;

function isEmail(value: string | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This reset request was blocked. Refresh the page and try again.', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxRequestBytes) {
    return jsonError('Reset request is too large.', 413);
  }

  let body: ResetRequestBody;
  try {
    body = (await request.json()) as ResetRequestBody;
  } catch {
    return jsonError('Invalid reset request.', 400);
  }

  const email = body.email?.trim().toLowerCase();
  if (!isEmail(email)) {
    return jsonError('Enter a valid email address.', 400);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${request.nextUrl.origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error('Password reset request failed', error);
  }

  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
