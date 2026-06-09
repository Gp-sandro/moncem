import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PostOwnerActions } from '@/components/PostOwnerActions';
import { ProofCallout } from '@/components/ProofCallout';
import { ReactionBar } from '@/components/ReactionBar';
import { ShareRow } from '@/components/ShareRow';
import { StartConversationButton } from '@/components/StartConversationButton';
import { formatDate, initialsFor, postTypeLabel, readingMinutes } from '@/lib/format';
import { getPostBySlug } from '@/lib/data';
import { getSiteUrl } from '@/lib/env';
import { getActiveReactions } from '@/lib/interactions';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

function ogImageFor(post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>): string {
  const params = new URLSearchParams({ title: post.title });
  if (post.milestone) params.set('proof', post.milestone);
  if (post.author.fullName) params.set('author', post.author.fullName);
  if (post.author.school) params.set('school', post.author.school);
  return `/api/og?${params.toString()}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: 'Dispatch not found' };
  }

  const description =
    post.excerpt ?? post.milestone ?? `A student founder dispatch from ${post.author.fullName} on Moncem.`;
  const canonical = `${getSiteUrl()}/p/${post.slug}`;
  const image = ogImageFor(post);

  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      url: canonical,
      type: 'article',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [image],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const post = await getPostBySlug(slug);
  if (!post) return notFound();

  const isAuthenticated = Boolean(user);
  const isOwnPost = post.author.id === user?.id;
  const activeReactions = isAuthenticated
    ? await getActiveReactions(supabase, user!.id, [post.id])
    : {};

  const paragraphs = (post.body ?? post.excerpt ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const authorLine = [post.author.school, post.author.currentProject].filter(Boolean).join(' / ');
  const canonical = `${getSiteUrl()}/p/${post.slug}`;

  return (
    <main className="reader">
      <article>
        <header className="reader-hero">
          <div className="reader-hero-inner">
            <p className="eyebrow" style={{ color: 'var(--venture)' }}>
              {postTypeLabel(post.type)} / {post.tags.slice(0, 2).join(' / ') || 'student founder'} /{' '}
              {readingMinutes(post.body)} min read
            </p>
            <h1>{post.title}</h1>
            <div className="post-meta">
              <span className="pill">{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </header>

        <section className="panel reader-author" style={{ padding: 22, marginTop: 18 }}>
          <div className="profile-top" style={{ marginBottom: 0 }}>
            <span className="avatar">{initialsFor(post.author.fullName, post.author.username)}</span>
            <div>
              <strong>{post.author.fullName}</strong>
              <p className="muted" style={{ margin: 0 }}>
                @{post.author.username}
                {authorLine ? ` / ${authorLine}` : ''}
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
                isAuthenticated={isAuthenticated}
                joinNext={`/p/${post.slug}`}
              />
            )}
          </div>
        </section>

        {post.milestone ? <ProofCallout milestone={post.milestone} /> : null}

        <section className="reader-body">
          <p className="eyebrow">Dispatch</p>
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          ) : (
            <p>This student founder has not added the full story yet.</p>
          )}
        </section>

        <section className="panel reader-share">
          <div>
            <p className="eyebrow">Share this dispatch</p>
            <h2>Send it to someone who should see it.</h2>
          </div>
          <ShareRow url={canonical} title={post.title} />
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
            isAuthenticated={isAuthenticated}
          />
        </section>

        <section className="panel reader-author-card">
          <div className="profile-top" style={{ marginBottom: 0 }}>
            <span className="avatar">{initialsFor(post.author.fullName, post.author.username)}</span>
            <div>
              <p className="eyebrow">Written by</p>
              <strong>{post.author.fullName}</strong>
              <p className="muted" style={{ margin: 0 }}>
                {authorLine || `@${post.author.username}`}
              </p>
            </div>
            <Link href={`/u/${post.author.username}`} className="button secondary" style={{ marginLeft: 'auto' }}>
              Read more from {post.author.fullName.split(' ')[0]}
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
