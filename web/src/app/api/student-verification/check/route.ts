import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isAcademicEmail } from '@/lib/student-verification';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This verification request was blocked. Refresh the page and try again.', 403);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Sign in before verifying student status.', 401);
  }

  if (!user.email_confirmed_at && !user.confirmed_at) {
    return jsonError('Verify your email before verifying student status.', 403);
  }

  if (!isAcademicEmail(user.email)) {
    return NextResponse.json(
      {
        ok: true,
        verified: false,
        reason: 'Use a verified school email to unlock the student badge. Manual review can come later for schools that use personal email domains.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      email_verified: true,
      edu_email_verified: true,
    })
    .eq('id', user.id);

  if (error) {
    console.error('Student verification update failed', error);
    return jsonError('Could not save student verification. Try again.', 400);
  }

  return NextResponse.json(
    { ok: true, verified: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
