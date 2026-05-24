import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isUserEmailVerified } from '@/lib/auth';
import { validatePostPayload, type PostPayload } from '@/lib/post-validation';
import { createClient } from '@/lib/supabase/server';

const maxRequestBytes = 25_000;

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

  let body: PostPayload;

  try {
    body = (await request.json()) as PostPayload;
  } catch {
    return jsonError('Invalid post request.', 400);
  }

  const { post, error: validationError } = validatePostPayload(body, user.id);
  if (!post) {
    return jsonError(validationError ?? 'Check your dispatch fields and try again.', 400);
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
      type: post.type,
      title: post.title,
      excerpt: post.excerpt ?? post.body.slice(0, 180),
      body: post.body,
      cover_url: post.coverUrl,
      milestone: post.milestone,
      tags: post.tags,
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
