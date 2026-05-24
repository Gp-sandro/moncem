import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FeedEmptyState } from '@/components/FeedEmptyState';
import { PostCard } from '@/components/PostCard';
import { getRecentPosts } from '@/lib/data';
import { isUserEmailVerified } from '@/lib/auth';
import { getActiveReactions } from '@/lib/interactions';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Feed',
};

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/join?next=/feed');
  if (!isUserEmailVerified(user)) redirect('/verify-email?next=/feed');

  const { data: profileData } = await supabase
    .rpc('get_own_profile')
    .maybeSingle();
  const profile = profileData as {
    school: string | null;
    current_project: string | null;
    connect_status: string | null;
  } | null;
  const showProfileCompletion = !profile?.school || !profile.current_project || profile.connect_status === 'closed';
  const posts = await safeArray(getRecentPosts(12));
  const activeReactions = await getActiveReactions(supabase, user.id, posts.map((post) => post.id));
  const [leadPost, ...restPosts] = posts;

  return (
    <main className="feed-page">
      <section className="shell compact-page-header feed-compact-header">
        <div>
          <h1>Feed</h1>
          <p>Dispatches from student founders building in public.</p>
        </div>
        <Link className="button venture" href="/post/new">
          Post
        </Link>
      </section>

      {showProfileCompletion ? (
        <section className="shell completion-card feed-completion-card slim-completion-card">
          <div>
            <strong>Complete your founder signal</strong>
            <p>
              Add school, current project, and connect status so builders can find you.
            </p>
          </div>
          <Link className="button venture" href="/settings/profile">
            Complete
          </Link>
        </section>
      ) : null}

      {leadPost ? (
        <section className="shell feed-scroll">
          <PostCard
            post={leadPost}
            variant="feature"
            activeReactions={activeReactions[leadPost.id] ?? []}
            isAuthenticated
          />
          {restPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              variant="list"
              activeReactions={activeReactions[post.id] ?? []}
              isAuthenticated
            />
          ))}
        </section>
      ) : (
        <section className="shell feed-scroll">
          <FeedEmptyState />
        </section>
      )}
    </main>
  );
}
