export function mapAuthError(raw: string): string {
  const msg = raw.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Please verify your email before signing in. Check your inbox.';
  }
  if (msg.includes('user already registered') || msg.includes('already registered') || msg.includes('already exists')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (msg.includes('password should be at least')) {
    return 'Password must be at least 8 characters.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Network error — check your connection and try again.';
  }
  if (msg.includes('email') && msg.includes('invalid')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('signup is disabled')) {
    return 'Account registration is currently unavailable. Try again later.';
  }

  return raw;
}

export interface PasswordCheck {
  label: string;
  passes: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordCheck[] = [
  { label: 'At least 8 characters', passes: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', passes: (pw) => /[A-Z]/.test(pw) },
  { label: 'One number', passes: (pw) => /[0-9]/.test(pw) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.passes(password));
}
