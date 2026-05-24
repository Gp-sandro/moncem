import { NextResponse, type NextRequest } from 'next/server';
import { isAcademicEmail } from '@/lib/student-verification';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/feed';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            email_verified: true,
            ...(isAcademicEmail(user.email) ? { edu_email_verified: true } : {}),
          })
          .eq('id', user.id);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
