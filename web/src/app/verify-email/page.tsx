import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isUserEmailVerified, safeNextPath } from '@/lib/auth';
import { maskEmail } from '@/lib/student-verification';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Verify email',
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (isUserEmailVerified(user)) {
    redirect(next);
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <p className="eyebrow">Email verification</p>
        <h1>Confirm your email first.</h1>
        <p className="section-copy">
          We need a verified email before you can post, react, or message other student founders.
          Check the inbox for <strong>{maskEmail(user.email)}</strong>, then return here.
        </p>
        <div className="hero-actions">
          <Link href="/login" className="button venture">
            I verified, sign in
          </Link>
          <Link href="/" className="button secondary">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
