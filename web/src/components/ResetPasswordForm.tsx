'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type ResetUpdateResult = {
  ok?: boolean;
  error?: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const checks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    match: password.length > 0 && password === confirmPassword,
  }), [confirmPassword, password]);

  const canSubmit = checks.length && checks.upper && checks.number && checks.match && !loading;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError('Use at least 8 characters, one uppercase letter, one number, and matching passwords.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/auth/password/reset-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json().catch(() => null)) as ResetUpdateResult | null;

      if (!response.ok || !result?.ok) {
        setError(result?.error ?? 'Could not update your password. Open the reset link again.');
        setLoading(false);
        return;
      }

      setDone(true);
      setLoading(false);
      router.refresh();
    } catch {
      setError('Could not reach the reset server. Check your connection and try again.');
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-success">
        <p className="eyebrow">Password updated</p>
        <h2>You can continue into Moncem.</h2>
        <p>Your new password is active for this account.</p>
        <Link className="button venture" href="/feed">
          Go to feed
        </Link>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {error ? <div className="error">{error}</div> : null}
      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </label>
      <div className="password-checks" aria-label="Password requirements">
        <span className={checks.length ? 'ok' : ''}>8+ characters</span>
        <span className={checks.upper ? 'ok' : ''}>Uppercase letter</span>
        <span className={checks.number ? 'ok' : ''}>Number</span>
        <span className={checks.match ? 'ok' : ''}>Passwords match</span>
      </div>
      <button className="button venture" type="submit" disabled={!canSubmit}>
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
}
