'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { trackClientEvent } from '@/lib/analytics-client';
import type { ConnectStatus } from '@/lib/types';

type StartConversationResult = {
  conversationId?: string;
  error?: string;
};

export function StartConversationButton({
  recipientId,
  recipientName,
  recipientStatus,
  contextPostId,
  contextTitle,
  isOwnProfile = false,
}: {
  recipientId: string;
  recipientName: string;
  recipientStatus: ConnectStatus;
  contextPostId?: string;
  contextTitle?: string;
  isOwnProfile?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = isOwnProfile || recipientStatus === 'closed';
  const helperText = isOwnProfile
    ? 'This is your profile.'
    : recipientStatus === 'closed'
      ? 'Not open to new conversations right now.'
      : 'Send a short, specific opener.';
  const canSend = message.trim().length > 0 && message.trim().length <= 500 && !sending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          contextPostId,
          body: message,
        }),
      });
      const result = (await response.json().catch(() => null)) as StartConversationResult | null;

      if (!response.ok || !result?.conversationId) {
        setError(result?.error ?? 'Could not start this conversation.');
        setSending(false);
        return;
      }

      trackClientEvent('conversation_start_success', {
        has_context_post: Boolean(contextPostId),
      });
      router.push(`/inbox/${result.conversationId}`);
      router.refresh();
    } catch {
      setError('Could not reach the conversation server.');
      setSending(false);
    }
  }

  if (isOwnProfile) return null;

  return (
    <>
      <button
        className="button venture"
        type="button"
        disabled={disabled}
        aria-label={`Start a conversation with ${recipientName}`}
        onClick={() => setOpen(true)}
      >
        Connect
      </button>
      {disabled ? <p className="button-helper">{helperText}</p> : null}
      {open ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="conversation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conversation-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>
              x
            </button>
            <p className="eyebrow">Start with context</p>
            <h2 id="conversation-modal-title">Message {recipientName}</h2>
            <p>
              {contextTitle
                ? `Reference "${contextTitle}" and ask something specific.`
                : 'Useful founder conversations start with one clear reason.'}
            </p>
            <form onSubmit={onSubmit}>
              <textarea
                rows={5}
                maxLength={500}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="I saw what you are building. Curious how you found your first users..."
                autoFocus
              />
              <div className="modal-actions">
                <span>{message.length}/500</span>
                <button className="button venture" type="submit" disabled={!canSend}>
                  {sending ? 'Sending...' : 'Send message'}
                </button>
              </div>
              {error ? <p className="inline-error">{error}</p> : null}
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
