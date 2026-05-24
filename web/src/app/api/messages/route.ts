import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin, jsonError } from '@/lib/api-security';
import { isUserEmailVerified } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

type SendMessageBody = {
  conversationId?: unknown;
  body?: unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError('This message request was blocked. Refresh the page and try again.', 403);
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError('Sign in before sending a message.', 401);
  }
  if (!isUserEmailVerified(user)) {
    return jsonError('Confirm your email before messaging.', 403);
  }

  let body: SendMessageBody;

  try {
    body = (await request.json()) as SendMessageBody;
  } catch {
    return jsonError('Invalid message request.', 400);
  }

  const conversationId = typeof body.conversationId === 'string' && uuidPattern.test(body.conversationId)
    ? body.conversationId
    : null;
  const messageBody = cleanMessage(body.body);

  if (!conversationId) {
    return jsonError('Choose a valid conversation.', 400);
  }

  if (!messageBody) {
    return jsonError('Write a message between 1 and 2000 characters.', 400);
  }

  const { data: allowed, error: rateError } = await supabase.rpc('check_message_rate_limit', {
    p_user_id: user.id,
  });

  if (rateError) {
    console.error('Message rate-limit check failed', rateError);
    return jsonError('Could not verify message limits. Try again in a minute.', 400);
  }

  if (allowed === false) {
    return jsonError("You're sending messages too quickly. Try again later.", 429);
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: messageBody,
    })
    .select('id, conversation_id, sender_id, body, created_at')
    .single();

  if (error) {
    console.error('Message insert failed', error);
    return jsonError('Could not send this message. Check the conversation and try again.', 400);
  }

  return NextResponse.json(
    {
      message: {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        body: data.body,
        createdAt: data.created_at,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
