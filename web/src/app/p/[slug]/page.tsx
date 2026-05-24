import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PostOwnerActions } from '@/components/PostOwnerActions';
import { ReactionBar } from '@/components/ReactionBar';
import { StartConversationButton } from '@/components/StartConversationButton';
import { isUserEmailVerified } from '@/lib/auth';
import { formatDate, initialsFor, postTypeLabel, readingMinutes } from '@/lib/format';
import { getPostBySlug } from '@/lib/data';
import { getActiveReactions } from '@/lib/interactions';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Founder dispatch',
    description: 'Sign in to read this Moncem founder dispatch.',
    openGraph: {
      title: 'Founder dispatch',
      description: 'Sign in to read this Moncem founder dispatch.',
      type: 'article',
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/join?next=${encodeURIComponent(`/p/${slug}`)}`);
  }
  if (!isUserEmailVerified(user)) {
    redirect(`/verify-email?next=${encodeURIComponent(`/p/${slug}`)}`);
  }

  const post = await getPostBySlug(slug);
  if (!post) return notFound();
  const isOwnPost = post.author.id === user.id;
  const activeReactions = await getActiveReactions(supabase, user.id, [post.id]);

  const paragraphs = (post.body ?? post.excerpt ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <main className="reader">
      <article>
        <header className="reader-hero">
          <div className="reader-hero-inner">
            <p className="eyebrow" style={{ color: 'var(--venture-soft)' }}>
              {postTypeLabel(post.type)} / {post.tags.slice(0, 2).join(' / ') || 'student founder'} /{' '}
              {readingMinutes(post.body)} min read
            </p>
            <h1>{post.title}</h1>
            <div className="post-meta">
              {post.milestone ? <span className="pill strong">{post.milestone}</span> : null}
              <span className="pill">{post.sparkedCount} sparks</span>
              <span className="pill">{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </header>
        <section className="panel" style={{ padding: 22, marginTop: 18 }}>
          <div className="profile-top" style={{ marginBottom: 0 }}>
            <span className="avatar">{initialsFor(post.author.fullName, post.author.username)}</span>
            <div>
              <strong>{post.author.fullName}</strong>
              <p className="muted" style={{ margin: 0 }}>
                @{post.author.username}
                {post.author.school ? ` / ${post.author.school}` : ''}
              </p>
            </div>
            <Link href={`/u/${post.author.username}`} className="button secondary" style={{ marginLeft: 'auto' }}>
              View profile
            </Link>
            {isOwnPost ? (
              <PostOwnerActions postId={post.id} postSlug={post.slug} postTitle={post.title} />
            ) : (
              <StartConversationButton
                recipientId={post.author.id}
                recipientName={post.author.fullName}
                recipientStatus={post.author.connectStatus}
                contextPostId={post.id}
                contextTitle={post.title}
                isOwnProfile={false}
              />
            )}
          </div>
        </section>
        <section className="panel reader-reactions">
          <div>
            <p className="eyebrow">Builder signal</p>
            <h2>React with what this helped you do.</h2>
          </div>
          <ReactionBar
            postId={post.id}
            postSlug={post.slug}
            initialCounts={{
              sparked: post.sparkedCount,
              validated: post.validatedCount,
              inthis: post.inthisCount,
            }}
            initialActiveReactions={activeReactions[post.id] ?? []}
            isAuthenticated
          />
        </section>
        <section className="reader-body">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          ) : (
            <p>This student founder has not added the full story yet.</p>
          )}
        </section>
      </article>
    </main>
  );
}
