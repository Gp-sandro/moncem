import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isUserEmailVerified } from '@/lib/auth';
import {
  coverPathFromPublicUrl,
  validatePostPayload,
  type PostPayload,
} from '@/lib/post-validation';
import { createClient } from '@/lib/supabase/server';

const maxRequestBytes = 25_000;

type Props = {
  params: Promise<{ id: string }>;
};

async function requireVerifiedUser(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return { error: jsonError('This post request was blocked. Refresh the page and try again.', 403) };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: jsonError('Sign in before editing posts.', 401) };
  }

  if (!isUserEmailVerified(user)) {
    return { error: jsonError('Confirm your email before editing posts.', 403) };
  }

  return { supabase, user };
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const auth = await requireVerifiedUser(request);
  if ('error' in auth) return auth.error;

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxRequestBytes) {
    return jsonError('This dispatch is too large for the web editor.', 413);
  }

  const { id } = await params;
  let body: PostPayload;

  try {
    body = (await request.json()) as PostPayload;
  } catch {
    return jsonError('Invalid post request.', 400);
  }

  const { post, error: validationError } = validatePostPayload(body, auth.user.id);
  if (!post) {
    return jsonError(validationError ?? 'Check your dispatch fields and try again.', 400);
  }

  const { data, error } = await auth.supabase
    .from('posts')
    .update({
      type: post.type,
      title: post.title,
      excerpt: post.excerpt ?? post.body.slice(0, 180),
      body: post.body,
      cover_url: post.coverUrl,
      milestone: post.milestone,
      tags: post.tags,
    })
    .eq('id', id)
    .eq('author_id', auth.user.id)
    .select('id, slug')
    .maybeSingle();

  if (error) {
    console.error('Post update failed', error);
    return jsonError('Could not update this dispatch. Check your fields and try again.', 400);
  }

  if (!data) {
    return jsonError('Post not found or you do not have permission to edit it.', 404);
  }

  return NextResponse.json(
    { slug: data.slug ?? data.id },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const auth = await requireVerifiedUser(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data: post, error: lookupError } = await auth.supabase
    .from('posts')
    .select('id, cover_url')
    .eq('id', id)
    .eq('author_id', auth.user.id)
    .maybeSingle();

  if (lookupError) {
    console.error('Post lookup before delete failed', lookupError);
    return jsonError('Could not verify this post before deleting it.', 400);
  }

  if (!post) {
    return jsonError('Post not found or you do not have permission to delete it.', 404);
  }

  const coverPath = coverPathFromPublicUrl(post.cover_url, auth.user.id);
  const { error: deleteError } = await auth.supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('author_id', auth.user.id);

  if (deleteError) {
    console.error('Post delete failed', deleteError);
    return jsonError('Could not delete this dispatch. Try again.', 400);
  }

  if (coverPath) {
    const { error: storageError } = await auth.supabase.storage.from('covers').remove([coverPath]);
    if (storageError) {
      console.error('Post cover cleanup failed', storageError);
    }
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
