import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MessageComposer } from '@/components/MessageComposer';
import { isUserEmailVerified } from '@/lib/auth';
import { formatDate, initialsFor } from '@/lib/format';
import { getConversationMessages, getConversationSummaries } from '@/lib/interactions';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: 'Conversation',
};

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/join?next=${encodeURIComponent(`/inbox/${id}`)}`);
  if (!isUserEmailVerified(user)) redirect(`/verify-email?next=${encodeURIComponent(`/inbox/${id}`)}`);

  const [conversations, messages] = await Promise.all([
    getConversationSummaries(supabase, user.id),
    getConversationMessages(supabase, id),
  ]);
  const conversation = conversations.find((item) => item.id === id);

  if (!conversation) return notFound();

  return (
    <main className="conversation-page">
      <section className="shell conversation-header">
        <Link href="/inbox" className="button secondary">
          Back
        </Link>
        <div className="conversation-title-row">
          <span className="avatar">{initialsFor(conversation.otherParticipant.fullName, conversation.otherParticipant.username)}</span>
          <div>
            <p className="eyebrow">Conversation</p>
            <h1>{conversation.otherParticipant.fullName}</h1>
            {conversation.contextPost ? (
              <Link href={`/p/${conversation.contextPost.slug}`}>Started from: {conversation.contextPost.title}</Link>
            ) : (
              <span>@{conversation.otherParticipant.username}</span>
            )}
          </div>
        </div>
      </section>

      <section className="shell message-thread" aria-label="Message thread">
        {messages.length > 0 ? (
          messages.map((message) => {
            const own = message.senderId === user.id;
            return (
              <article className={`message-bubble ${own ? 'own' : ''}`} key={message.id}>
                <p>{message.body}</p>
                <time>{formatDate(message.createdAt)}</time>
              </article>
            );
          })
        ) : (
          <div className="empty">
            <p>No messages in this conversation yet.</p>
          </div>
        )}
      </section>

      <section className="shell">
        <MessageComposer conversationId={conversation.id} />
      </section>
    </main>
  );
}
