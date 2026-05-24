import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { safeNextPath } from '@/lib/auth';

export const metadata = {
  title: 'Sign in',
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to Moncem.</h1>
        {params.error === 'google_auth_failed' ? (
          <div className="error">Google sign-in could not start. Try again or use email.</div>
        ) : null}
        <SocialAuthButtons mode="login" nextPath={nextPath} />
        <AuthForm mode="login" nextPath={nextPath} />
        <p className="muted" style={{ marginTop: 18 }}>
          New here? <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>Create an account</Link>
        </p>
      </section>
    </main>
  );
}
