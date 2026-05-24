import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isUserEmailVerified } from '@/lib/auth';
import type { ReactionType } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

type ToggleReactionBody = {
  postId?: unknown;
  type?: unknown;
};

const reactionTypes = new Set<ReactionType>(['sparked', 'validated', 'inthis']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This reaction request was blocked. Refresh the page and try again.', 403);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Sign in before reacting.', 401);
  }
  if (!isUserEmailVerified(user)) {
    return jsonError('Confirm your email before reacting.', 403);
  }

  let body: ToggleReactionBody;

  try {
    body = (await request.json()) as ToggleReactionBody;
  } catch {
    return jsonError('Invalid reaction request.', 400);
  }

  const postId = typeof body.postId === 'string' && uuidPattern.test(body.postId) ? body.postId : null;
  const type = typeof body.type === 'string' && reactionTypes.has(body.type as ReactionType)
    ? (body.type as ReactionType)
    : null;

  if (!postId || !type) {
    return jsonError('Choose a valid post reaction.', 400);
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .maybeSingle();

  if (postError) {
    console.error('Reaction post lookup failed', postError);
    return jsonError('Could not find this post. Try again.', 400);
  }

  if (!post) {
    return jsonError('This post no longer exists.', 404);
  }

  const { data: existing, error: existingError } = await supabase
    .from('reactions')
    .select('post_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .eq('type', type)
    .maybeSingle();

  if (existingError) {
    console.error('Reaction lookup failed', existingError);
    return jsonError('Could not check your reaction. Try again.', 400);
  }

  if (existing) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .eq('type', type);

    if (error) {
      console.error('Reaction delete failed', error);
      return jsonError('Could not remove your reaction. Try again.', 400);
    }
  } else {
    const { error } = await supabase
      .from('reactions')
      .insert({ user_id: user.id, post_id: postId, type });

    if (error) {
      console.error('Reaction insert failed', error);
      return jsonError('Could not save your reaction. Try again.', 400);
    }
  }

  const [{ data: counts, error: countsError }, { data: activeRows, error: activeError }] = await Promise.all([
    supabase
      .from('posts')
      .select('sparked_count, validated_count, inthis_count')
      .eq('id', postId)
      .single(),
    supabase
      .from('reactions')
      .select('type')
      .eq('user_id', user.id)
      .eq('post_id', postId),
  ]);

  if (countsError || activeError) {
    console.error('Reaction refresh failed', countsError ?? activeError);
    return jsonError('Reaction saved, but counts could not refresh.', 400);
  }

  return NextResponse.json(
    {
      counts: {
        sparked: Number(counts?.sparked_count ?? 0),
        validated: Number(counts?.validated_count ?? 0),
        inthis: Number(counts?.inthis_count ?? 0),
      },
      activeReactions: ((activeRows ?? []) as Array<{ type: string }>)
        .map((row) => row.type)
        .filter((value): value is ReactionType => reactionTypes.has(value as ReactionType)),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
