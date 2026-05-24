import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';

export const metadata = {
  title: 'Reset password',
};

export default function ForgotPasswordPage() {
  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <p className="eyebrow">Account recovery</p>
        <h1>Reset your password.</h1>
        <p className="auth-copy">
          Enter the email you used for Moncem. If it exists, we will send a private reset link.
        </p>
        <ForgotPasswordForm />
        <p className="muted" style={{ marginTop: 18 }}>
          Remembered it? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
