'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { trackClientEvent } from '@/lib/analytics-client';

type Mode = 'login' | 'signup';

type AuthResult = {
  ok?: boolean;
  needsEmailConfirmation?: boolean;
  error?: string;
};

export function AuthForm({ mode, nextPath = '/feed' }: { mode: Mode; nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [school, setSchool] = useState('');
  const [currentProject, setCurrentProject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const isSignup = mode === 'signup';
  const safeNextPath =
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/feed';

  useEffect(() => {
    trackClientEvent(isSignup ? 'auth_signup_view' : 'auth_login_view');
  }, [isSignup]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setConfirmationEmail(null);
    trackClientEvent(isSignup ? 'auth_signup_submit' : 'auth_login_submit');

    let response: Response;
    try {
      response = await fetch('/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          email: email.trim().toLowerCase(),
          password,
          fullName,
          username,
          school,
          currentProject,
          nextPath: safeNextPath,
        }),
      });
    } catch {
      setError('Could not reach the local auth server. Restart the web dev server and try again.');
      setLoading(false);
      return;
    }

    const result = (await response.json().catch(() => null)) as AuthResult | null;

    if (!response.ok) {
      setError(result?.error ?? 'Sign in failed. Please try again.');
      trackClientEvent('auth_error', { mode, reason: result?.error ?? 'unknown' });
      setLoading(false);
      return;
    }

    if (result?.needsEmailConfirmation) {
      setConfirmationEmail(email.trim().toLowerCase());
      trackClientEvent('auth_email_confirmation_required');
      setLoading(false);
      return;
    }

    trackClientEvent('auth_success', { mode });
    router.replace(safeNextPath);
    router.refresh();
  }

  if (confirmationEmail) {
    return (
      <div className="auth-success">
        <p className="eyebrow">Check your email</p>
        <h2>Confirm your account before entering beta.</h2>
        <p>
          We sent a verification link to <strong>{confirmationEmail}</strong>. Open it on this device
          and Moncem will bring you back to the feed.
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
      {isSignup ? (
        <>
          <label>
            Full name
            <input
              type="text"
              autoComplete="name"
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
          <label>
            Username
            <input
              type="text"
              autoComplete="username"
              maxLength={30}
              placeholder="sandro"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              required
            />
          </label>
          <label>
            School
            <input
              type="text"
              maxLength={120}
              placeholder="UC Davis, Stanford, Tbilisi school..."
              value={school}
              onChange={(event) => setSchool(event.target.value)}
            />
          </label>
          <label>
            What are you building?
            <input
              type="text"
              maxLength={160}
              placeholder="One line about your project"
              value={currentProject}
              onChange={(event) => setCurrentProject(event.target.value)}
            />
          </label>
        </>
      ) : null}
      <label>
        Password
        <input
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <button className="button venture" type="submit" disabled={loading}>
        {loading ? 'Working...' : isSignup ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
