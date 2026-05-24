import type { PostType } from '@/lib/types';

export type PostPayload = {
  type?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  milestone?: string;
  tags?: unknown;
  coverUrl?: string;
  coverPath?: string;
};

export type CleanPostPayload = {
  type: PostType;
  title: string;
  body: string;
  excerpt: string | null;
  milestone: string | null;
  tags: string[];
  coverUrl: string | null;
  coverPath: string | null;
};

const postTypes = new Set<PostType>(['journey', 'build', 'idea', 'demo']);

export function cleanOptional(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  return [...new Set(
    tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter((tag) => /^[a-z0-9][a-z0-9 +#._-]{0,31}$/i.test(tag))
      .slice(0, 5),
  )];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function isOwnedCoverPath(value: string | null, userId: string): boolean {
  return Boolean(value && value.startsWith(`${userId}/`) && value.includes('/cover.'));
}

export function validatePostPayload(payload: PostPayload, userId: string): {
  post?: CleanPostPayload;
  error?: string;
} {
  const title = cleanOptional(payload.title, 150);
  const body = cleanOptional(payload.body, 10000);
  const excerpt = cleanOptional(payload.excerpt, 240);
  const milestone = cleanOptional(payload.milestone, 150);
  const coverUrl = cleanOptional(payload.coverUrl, 500);
  const coverPath = cleanOptional(payload.coverPath, 500);
  const tags = cleanTags(payload.tags);
  const type = postTypes.has(payload.type as PostType) ? (payload.type as PostType) : null;

  if (!type) {
    return { error: 'Choose what kind of dispatch this is.' };
  }

  if (!title) {
    return { error: 'Add a title before publishing.' };
  }

  if (!body || body.length < 40) {
    return { error: 'Write at least a few sentences so readers have real context.' };
  }

  if (coverUrl && !isHttpUrl(coverUrl)) {
    return { error: 'Cover image must be a Moncem/Supabase image URL.' };
  }

  if (coverUrl && !isOwnedCoverPath(coverPath, userId)) {
    return { error: 'Upload the cover through Moncem before publishing.' };
  }

  return {
    post: {
      type,
      title,
      body,
      excerpt,
      milestone,
      tags,
      coverUrl,
      coverPath,
    },
  };
}

export function coverPathFromPublicUrl(coverUrl: string | null, userId: string): string | null {
  if (!coverUrl) return null;

  try {
    const url = new URL(coverUrl);
    const marker = '/storage/v1/object/public/covers/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}
