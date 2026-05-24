import { redirect } from 'next/navigation';
import Link from 'next/link';
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
      <section className="shell feed-hero-strip">
        <div>
          <p className="eyebrow">Student founder feed</p>
          <h1 className="feed-title">Proof from people still in motion.</h1>
          <p className="section-copy">
            Read one clear dispatch at a time: what they built, what moved, and
            who is open to talk.
          </p>
        </div>
        <div className="feed-metrics" aria-label="Feed summary">
          <div>
            <strong>{posts.length}</strong>
            <span>live stories</span>
          </div>
          <div>
            <strong>{posts.reduce((total, post) => total + post.sparkedCount, 0)}</strong>
            <span>sparks</span>
          </div>
        </div>
      </section>

      {showProfileCompletion ? (
        <section className="shell completion-card feed-completion-card">
          <div>
            <p className="eyebrow">Profile strength</p>
            <h2>Finish the signals that help student founders find you.</h2>
            <p>
              Add your school, current project, and connect status so Schools and
              Connect become useful for the beta group.
            </p>
          </div>
          <Link className="button venture" href="/settings/profile">
            Complete profile
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
        <section className="shell section">
          <div className="empty">
          <p>Your web feed is quiet right now.</p>
          </div>
        </section>
      )}
    </main>
  );
}
