import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('public_profiles_web').select('id').limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          hint: 'If the error mentions public_profiles_web, apply migration 013_student_founder_web_pivot.sql.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
      const cause = error.cause as { code?: string; hostname?: string } | undefined;
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          cause: cause?.code ?? null,
          host: cause?.hostname ?? null,
          hint:
            cause?.code === 'ENOTFOUND'
              ? 'The Supabase project host does not resolve. Confirm the project is not paused/deleted and update web/.env.local with the current project URL.'
              : 'The web server could not reach Supabase. Check internet/DNS access and Supabase environment values.',
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown Supabase health check error.',
      },
      { status: 503 },
    );
  }
}
