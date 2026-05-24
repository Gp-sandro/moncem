import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { safeNextPath } from '@/lib/auth';

export const metadata = {
  title: 'Join beta',
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <p className="eyebrow">Private beta</p>
        <h1>Join the student founder map.</h1>
        <SocialAuthButtons mode="signup" nextPath={nextPath} />
        <AuthForm mode="signup" nextPath={nextPath} />
        <p className="muted" style={{ marginTop: 18 }}>
          Already have an account? <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link>
        </p>
      </section>
    </main>
  );
}
