import Link from 'next/link';
import { FieldCard } from '@/components/FieldCard';
import { FoundingFounders } from '@/components/FoundingFounders';
import { PostCard } from '@/components/PostCard';
import { getFeaturedProfiles, getRecentPosts } from '@/lib/data';
import { getActiveReactions } from '@/lib/interactions';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [posts, profiles] = await Promise.all([
    safeArray(getRecentPosts(6)),
    safeArray(getFeaturedProfiles(6)),
  ]);
  const activeReactions = await getActiveReactions(supabase, user?.id, posts.map((post) => post.id));
  const [leadPost, ...restPosts] = posts;

  return (
    <main>
      <section className="shell hero">
        <div>
          <p className="eyebrow">Student founders / proof in motion</p>
          <h1>
            Build before the world <span>notices.</span>
          </h1>
          <p className="lead">
            Moncem is where student founders share real build stories, early traction,
            demos, ideas, and lessons, so ambitious students can discover each other
            before the headlines arrive.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="button venture">
              Join the beta
            </Link>
            <Link href="/feed" className="button secondary">
              Read dispatches
            </Link>
          </div>
        </div>
      </section>

      <FoundingFounders profiles={profiles} />

      <section className="shell section compact-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Explore fields</p>
            <h2 className="display-title">Start with the market map.</h2>
          </div>
          <Link href="/feed" className="button secondary">
            View all
          </Link>
        </div>
        <div className="field-grid-large">
          <FieldCard href="/feed?tag=AI" label="AI agents" metric="builds" index={0} />
          <FieldCard href="/feed?tag=SaaS" label="SaaS" metric="stories" index={1} />
          <FieldCard href="/feed?tag=Dev%20Tools" label="Dev tools" metric="demos" index={2} />
          <FieldCard href="/feed?tag=Health" label="Health" metric="launches" index={3} />
        </div>
      </section>

      <section className="shell discovery-layout section">
        <div className="stories">
          <div className="section-head">
            <div>
              <p className="eyebrow">Live stories</p>
              <h2 className="display-title">What students are building.</h2>
            </div>
          </div>
          {leadPost ? (
            <>
              <PostCard
                post={leadPost}
                variant="feature"
                activeReactions={activeReactions[leadPost.id] ?? []}
                isAuthenticated={Boolean(user)}
              />
              {restPosts.slice(0, 3).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  variant="list"
                  activeReactions={activeReactions[post.id] ?? []}
                  isAuthenticated={Boolean(user)}
                />
              ))}
            </>
          ) : (
            <div className="empty">
              <div>
                <p className="eyebrow">Early days</p>
                <p>Nothing here yet. That&apos;s the point — be early.</p>
              </div>
            </div>
          )}
        </div>
        <aside className="discovery-sidebar">
          <section className="discovery-panel">
            <p className="eyebrow">Why Moncem</p>
            <h3>Fast context. Real proof. Useful people.</h3>
            <p className="panel-copy">
              The web product should feel like a founder map, not another social feed.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
