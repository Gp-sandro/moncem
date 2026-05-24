import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { createClient } from '@/lib/supabase/server';

type ResetUpdateBody = {
  password?: string;
};

const maxRequestBytes = 2_000;

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'Enter a new password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter.';
  if (!/\d/.test(password)) return 'Add at least one number.';
  return null;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This reset request was blocked. Refresh the page and try again.', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxRequestBytes) {
    return jsonError('Reset request is too large.', 413);
  }

  let body: ResetUpdateBody;
  try {
    body = (await request.json()) as ResetUpdateBody;
  } catch {
    return jsonError('Invalid reset request.', 400);
  }

  const validationError = validatePassword(body.password);
  if (validationError) {
    return jsonError(validationError, 400);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Open the latest reset link from your email before setting a new password.', 401);
  }

  const { error } = await supabase.auth.updateUser({ password: body.password });
  if (error) {
    return jsonError(error.message, 400);
  }

  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
