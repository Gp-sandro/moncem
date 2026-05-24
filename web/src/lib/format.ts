export function initialsFor(name: string, fallback: string): string {
  const initials = name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return initials || fallback.slice(0, 2).toUpperCase();
}

export function formatStudentStatus(status: string | null): string {
  if (!status) return 'Student founder';
  return status
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

export function readingMinutes(body: string | null): number {
  if (!body) return 1;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function postTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
