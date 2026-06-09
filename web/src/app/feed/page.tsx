import type { Metadata } from 'next';
import Link from 'next/link';
import { FeedEmptyState } from '@/components/FeedEmptyState';
import { PostCard } from '@/components/PostCard';
import { getPostsByTag, getRecentPosts, getTopicSummaries } from '@/lib/data';
import { getActiveReactions } from '@/lib/interactions';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export const metadata: Metadata = {
  title: 'Read',
  description: 'Dispatches from student founders building in public, newest first.',
};

export const dynamic = 'force-dynamic';

export default async function FeedPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);

  const { tag: rawTag } = await searchParams;
  const activeTag = rawTag ? decodeURIComponent(rawTag) : null;

  const [posts, topics] = await Promise.all([
    safeArray(activeTag ? getPostsByTag(activeTag) : getRecentPosts(12)),
    safeArray(getTopicSummaries()),
  ]);

  // Logged-in founders get a profile-completion nudge.
  let showProfileCompletion = false;
  if (isAuthenticated) {
    const { data: profileData } = await supabase.rpc('get_own_profile').maybeSingle();
    const profile = profileData as {
      school: string | null;
      current_project: string | null;
      connect_status: string | null;
    } | null;
    showProfileCompletion = !profile?.school || !profile.current_project || profile.connect_status === 'closed';
  }

  const activeReactions = await getActiveReactions(supabase, user?.id, posts.map((post) => post.id));
  const [leadPost, ...restPosts] = posts;

  return (
    <main className="feed-page">
      <section className="shell compact-page-header feed-compact-header">
        <div>
          <h1>Read</h1>
          <p>Dispatches from student founders building in public.</p>
        </div>
        <Link className="button venture" href={isAuthenticated ? '/post/new' : '/join?next=/post/new'}>
          {isAuthenticated ? 'Write' : 'Join'}
        </Link>
      </section>

      {topics.length > 0 ? (
        <section className="shell feed-filter-row" aria-label="Filter by tag">
          <Link className={`filter-chip ${!activeTag ? 'active' : ''}`} href="/feed">
            All
          </Link>
          {topics.map((topic) => (
            <Link
              key={topic.tag}
              className={`filter-chip ${activeTag === topic.tag ? 'active' : ''}`}
              href={`/feed?tag=${encodeURIComponent(topic.tag)}`}
            >
              {topic.tag}
            </Link>
          ))}
        </section>
      ) : null}

      {showProfileCompletion ? (
        <section className="shell completion-card feed-completion-card slim-completion-card">
          <div>
            <strong>Complete your founder signal</strong>
            <p>Add school, current project, and connect status so builders can find you.</p>
          </div>
          <Link className="button venture" href="/settings/profile">
            Complete
          </Link>
        </section>
      ) : null}

      {leadPost ? (
        <section className="shell feed-scroll">
          {activeTag ? (
            <Link href="/feed" className="button secondary tag-back-link">
              All dispatches
            </Link>
          ) : null}
          <PostCard
            post={leadPost}
            variant="feature"
            activeReactions={activeReactions[leadPost.id] ?? []}
            isAuthenticated={isAuthenticated}
          />
          {restPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              variant="list"
              activeReactions={activeReactions[post.id] ?? []}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </section>
      ) : (
        <section className="shell feed-scroll">
          {activeTag ? (
            <div className="empty">
              <div>
                <p className="eyebrow">No signal yet</p>
                <p>No dispatches tagged “{activeTag}” yet.</p>
                <Link href="/feed" className="button secondary">
                  Back to all dispatches
                </Link>
              </div>
            </div>
          ) : (
            <FeedEmptyState />
          )}
        </section>
      )}
    </main>
  );
}
