import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isUserEmailVerified } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

type StartConversationBody = {
  recipientId?: unknown;
  contextPostId?: unknown;
  body?: unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This conversation request was blocked. Refresh the page and try again.', 403);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Sign in before starting a conversation.', 401);
  }
  if (!isUserEmailVerified(user)) {
    return jsonError('Confirm your email before starting conversations.', 403);
  }

  let body: StartConversationBody;

  try {
    body = (await request.json()) as StartConversationBody;
  } catch {
    return jsonError('Invalid conversation request.', 400);
  }

  const recipientId = typeof body.recipientId === 'string' && uuidPattern.test(body.recipientId)
    ? body.recipientId
    : null;
  const contextPostId = typeof body.contextPostId === 'string' && uuidPattern.test(body.contextPostId)
    ? body.contextPostId
    : null;
  const firstMessage = cleanMessage(body.body);

  if (!recipientId) {
    return jsonError('Choose a founder to message.', 400);
  }

  if (recipientId === user.id) {
    return jsonError('You cannot start a conversation with yourself.', 400);
  }

  if (!firstMessage) {
    return jsonError('Write a message between 1 and 500 characters.', 400);
  }

  const { data: recipient, error: recipientError } = await supabase
    .from('profiles')
    .select('id, connect_status')
    .eq('id', recipientId)
    .maybeSingle();

  if (recipientError) {
    console.error('Conversation recipient lookup failed', recipientError);
    return jsonError('Could not find this founder. Try again.', 400);
  }

  if (!recipient) {
    return jsonError('This founder profile no longer exists.', 404);
  }

  if (recipient.connect_status === 'closed') {
    return jsonError('This founder is not open to new conversations right now.', 403);
  }

  const { data: allowed, error: rateError } = await supabase.rpc('check_conversation_rate_limit', {
    p_user_id: user.id,
  });

  if (rateError) {
    console.error('Conversation rate-limit check failed', rateError);
    return jsonError('Could not verify conversation limits. Try again in a minute.', 400);
  }

  if (allowed === false) {
    return jsonError("You've started too many conversations today. Try again tomorrow.", 429);
  }

  const { data: conversationId, error } = await supabase.rpc('start_conversation', {
    recipient_id: recipientId,
    context_post_id: contextPostId,
    first_message: firstMessage,
  });

  if (error || !conversationId) {
    console.error('Conversation start failed', error);
    return jsonError('Could not start this conversation. Try again.', 400);
  }

  return NextResponse.json(
    { conversationId },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
