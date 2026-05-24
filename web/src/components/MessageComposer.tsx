'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { trackClientEvent } from '@/lib/analytics-client';

type SendMessageResult = {
  message?: {
    id: string;
  };
  error?: string;
};

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSend = body.trim().length > 0 && body.trim().length <= 2000 && !sending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, body }),
      });
      const result = (await response.json().catch(() => null)) as SendMessageResult | null;

      if (!response.ok || !result?.message) {
        setError(result?.error ?? 'Could not send this message.');
        setSending(false);
        return;
      }

      setBody('');
      setSending(false);
      trackClientEvent('message_send_success');
      router.refresh();
    } catch {
      setError('Could not reach the message server.');
      setSending(false);
    }
  }

  return (
    <form className="message-composer" onSubmit={onSubmit}>
      <textarea
        rows={3}
        maxLength={2000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Reply with context..."
      />
      <div className="message-composer-actions">
        <span>{body.length}/2000</span>
        <button className="button venture" type="submit" disabled={!canSend}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
      {error ? <p className="inline-error">{error}</p> : null}
    </form>
  );
}
