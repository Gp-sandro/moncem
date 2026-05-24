'use client';

import Link from 'next/link';
import { trackClientEvent } from '@/lib/analytics-client';

export function SocialAuthButtons({
  mode,
  nextPath = '/feed',
}: {
  mode: 'login' | 'signup';
  nextPath?: string;
}) {
  const next = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/feed';
  const href = `/auth/oauth/google?next=${encodeURIComponent(next)}`;

  return (
    <div className="social-auth">
      <Link
        href={href}
        className="google-auth-button"
        onClick={() => trackClientEvent('auth_google_start', { mode })}
      >
        <span className="google-mark" aria-hidden="true">G</span>
        Continue with Google
      </Link>
      <div className="auth-divider">
        <span>or</span>
      </div>
    </div>
  );
}
