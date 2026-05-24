import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export const metadata = {
  title: 'Join Moncem',
};

function safeNextPath(value: string | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/feed';
}

export default async function JoinWallPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="auth-wall">
      <section className="shell auth-wall-grid">
        <div className="auth-wall-copy">
          <p className="eyebrow">Members only</p>
          <h1>Join before you post, read private dispatches, or open founder profiles.</h1>
          <p>
            Moncem is opening as a trusted student-founder network. Public pages show the
            direction; product surfaces stay behind sign-in so builders know who is inside.
          </p>
          <div className="auth-wall-actions">
            <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="button venture">
              Join beta
            </Link>
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="button secondary">
              Sign in
            </Link>
          </div>
        </div>
        <aside className="auth-wall-card">
          <p className="eyebrow">Protected surfaces</p>
          <ul>
            <li>Publishing founder dispatches</li>
            <li>Reading full post pages</li>
            <li>Viewing founder profiles</li>
            <li>Opening the personalized feed</li>
            <li>Using connect and conversation surfaces</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
