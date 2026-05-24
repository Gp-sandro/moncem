const personalEmailDomains = new Set([
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'proton.me',
  'protonmail.com',
]);

const knownAcademicDomains = new Set([
  'freeuni.edu.ge',
  'kiu.edu.ge',
  'tsu.ge',
  'iliauni.edu.ge',
  'btu.edu.ge',
  'stanford.edu',
  'mit.edu',
  'ucdavis.edu',
]);

export function getEmailDomain(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@').pop()?.trim().toLowerCase();
  return domain || null;
}

export function isAcademicEmail(email: string | null | undefined): boolean {
  const domain = getEmailDomain(email);
  if (!domain || personalEmailDomains.has(domain)) return false;

  return (
    knownAcademicDomains.has(domain) ||
    domain.endsWith('.edu') ||
    domain.includes('.edu.') ||
    domain.includes('.ac.')
  );
}

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return 'your signed-in email';
  const [name, domain] = email.split('@');
  const visible = name.slice(0, 2);
  return `${visible}${name.length > 2 ? '...' : ''}@${domain}`;
}
