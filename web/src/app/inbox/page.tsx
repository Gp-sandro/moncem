import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isUserEmailVerified } from '@/lib/auth';
import { formatDate, initialsFor } from '@/lib/format';
import { getConversationSummaries } from '@/lib/interactions';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Inbox',
};

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/join?next=/inbox');
  if (!isUserEmailVerified(user)) redirect('/verify-email?next=/inbox');

  const conversations = await getConversationSummaries(supabase, user.id);

  return (
    <main className="inbox-page">
      <section className="shell inbox-hero">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1>Founder conversations with context.</h1>
        </div>
        <p>
          Every thread starts from a profile, post, or specific build signal, so replies
          have somewhere useful to begin.
        </p>
      </section>

      <section className="shell inbox-list" aria-label="Conversations">
        {conversations.length > 0 ? (
          conversations.map((conversation) => (
            <Link className="conversation-row" href={`/inbox/${conversation.id}`} key={conversation.id}>
              <span className="avatar">{initialsFor(conversation.otherParticipant.fullName, conversation.otherParticipant.username)}</span>
              <span className="conversation-main">
                <strong>{conversation.otherParticipant.fullName}</strong>
                <span>
                  {conversation.lastMessage?.body ?? 'Conversation started.'}
                </span>
                {conversation.contextPost ? (
                  <em>Re: {conversation.contextPost.title}</em>
                ) : null}
              </span>
              <time>{formatDate(conversation.lastMessageAt)}</time>
            </Link>
          ))
        ) : (
          <div className="empty empty-action">
            <div>
              <p className="eyebrow">No conversations yet</p>
              <p>When you reach out to a student founder, the thread appears here.</p>
              <Link className="button venture" href="/connect">
                Find builders
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
