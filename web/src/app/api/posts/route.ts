import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isUserEmailVerified } from '@/lib/auth';
import type { PostType } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

const postTypes = new Set<PostType>(['journey', 'build', 'idea', 'demo']);
const maxRequestBytes = 25_000;

type CreatePostBody = {
  type?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  milestone?: string;
  tags?: string[];
  coverUrl?: string;
  coverPath?: string;
};

function cleanOptional(value: unknown, maxLength: number): string | null {
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

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This publish request was blocked. Refresh the page and try again.', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxRequestBytes) {
    return jsonError('This dispatch is too large for the web composer.', 413);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Sign in before publishing.', 401);
  }
  if (!isUserEmailVerified(user)) {
    return jsonError('Confirm your email before publishing.', 403);
  }

  let body: CreatePostBody;

  try {
    body = (await request.json()) as CreatePostBody;
  } catch {
    return jsonError('Invalid post request.', 400);
  }

  const title = cleanOptional(body.title, 150);
  const postBody = cleanOptional(body.body, 10000);
  const excerpt = cleanOptional(body.excerpt, 240);
  const milestone = cleanOptional(body.milestone, 150);
  const coverUrl = cleanOptional(body.coverUrl, 500);
  const coverPath = cleanOptional(body.coverPath, 500);
  const tags = cleanTags(body.tags);
  const type = postTypes.has(body.type as PostType) ? (body.type as PostType) : null;

  if (!type) {
    return jsonError('Choose what kind of dispatch this is.', 400);
  }

  if (!title) {
    return jsonError('Add a title before publishing.', 400);
  }

  if (!postBody || postBody.length < 40) {
    return jsonError('Write at least a few sentences so readers have real context.', 400);
  }

  if (coverUrl && !isHttpUrl(coverUrl)) {
    return jsonError('Cover image must be a Moncem/Supabase image URL.', 400);
  }

  if (coverUrl && !isOwnedCoverPath(coverPath, user.id)) {
    return jsonError('Upload the cover through Moncem before publishing.', 400);
  }

  const { data: allowed, error: rateError } = await supabase.rpc('check_post_rate_limit', {
    p_user_id: user.id,
  });

  if (rateError) {
    console.error('Post rate-limit check failed', rateError);
    return jsonError('Could not verify publishing limits. Try again in a minute.', 400);
  }

  if (allowed === false) {
    return jsonError("You're publishing too quickly. Give it a little time and try again.", 429);
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      type,
      title,
      excerpt: excerpt ?? postBody.slice(0, 180),
      body: postBody,
      cover_url: coverUrl,
      milestone,
      tags,
    })
    .select('id, slug')
    .single();

  if (error) {
    console.error('Post publish failed', error);
    return jsonError('Could not publish this dispatch. Check your fields and try again.', 400);
  }

  return NextResponse.json(
    { slug: data.slug ?? data.id },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
