import type { Profile } from './types';

export function displayName(profile: Profile | null | undefined): string {
  if (!profile) return 'Unknown';
  return profile.fullName?.trim() || profile.username || 'Unknown';
}
