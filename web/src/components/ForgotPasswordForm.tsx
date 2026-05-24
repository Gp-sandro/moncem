'use client';

import { useState, type FormEvent } from 'react';

type ResetRequestResult = {
  ok?: boolean;
  error?: string;
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/auth/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json().catch(() => null)) as ResetRequestResult | null;

      if (!response.ok || !result?.ok) {
        setError(result?.error ?? 'Could not send a reset link. Try again.');
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError('Could not reach the reset server. Check your connection and try again.');
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-success">
        <p className="eyebrow">Check your email</p>
        <h2>If an account exists, the reset link is on its way.</h2>
        <p>
          Open the link on this device. It will bring you back to Moncem to set a new password.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {error ? <div className="error">{error}</div> : null}
      <label>
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <button className="button venture" type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send reset link'}
      </button>
    </form>
  );
}
