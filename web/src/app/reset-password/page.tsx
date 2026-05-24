import Link from 'next/link';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export const metadata = {
  title: 'Set new password',
};

export default function ResetPasswordPage() {
  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <p className="eyebrow">New password</p>
        <h1>Choose a stronger key.</h1>
        <p className="auth-copy">
          This page works after you open a Supabase recovery link from your email.
        </p>
        <ResetPasswordForm />
        <p className="muted" style={{ marginTop: 18 }}>
          Link expired? <Link href="/forgot-password">Send a new reset link</Link>
        </p>
      </section>
    </main>
  );
}
