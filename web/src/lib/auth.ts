import type { User } from '@supabase/supabase-js';

export function safeNextPath(value: string | null | undefined, fallback = '/feed'): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export function isUserEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;

  const provider = typeof user.app_metadata?.provider === 'string'
    ? user.app_metadata.provider
    : null;

  return Boolean(
    user.email_confirmed_at ||
    user.confirmed_at ||
    provider === 'google' ||
    provider === 'apple',
  );
}
