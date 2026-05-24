import Link from 'next/link';
import { FieldCard } from '@/components/FieldCard';
import { FounderRow } from '@/components/FounderRow';
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
    safeArray(getFeaturedProfiles(3)),
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
            <Link href="/explore" className="button secondary">
              Explore stories
            </Link>
          </div>
        </div>

        <aside className="pulse-card">
          <div>
            <p className="eyebrow">Live beta</p>
            <strong>{posts.length + profiles.length}</strong>
          </div>
          <p>stories and founder signals from student builders already shipping.</p>
        </aside>
      </section>

      <section className="shell section compact-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Explore fields</p>
            <h2 className="display-title">Start with the market map.</h2>
          </div>
          <Link href="/explore" className="button secondary">
            View all
          </Link>
        </div>
        <div className="field-grid-large">
          <FieldCard href="/explore/AI" label="AI agents" metric="builds" index={0} />
          <FieldCard href="/explore/SaaS" label="SaaS" metric="stories" index={1} />
          <FieldCard href="/explore/Dev%20Tools" label="Dev tools" metric="demos" index={2} />
          <FieldCard href="/explore/Health" label="Health" metric="launches" index={3} />
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
                <p className="eyebrow">Beta warming up</p>
                <p>Student founder stories will appear here after the web migration lands.</p>
              </div>
            </div>
          )}
        </div>
        <aside className="discovery-sidebar">
          <section className="discovery-panel">
            <p className="eyebrow">Lighthouse builders</p>
            <h3>Start with people who shipped.</h3>
            {profiles.length > 0 ? (
              <div className="founder-list">
                {profiles.map((profile) => (
                  <FounderRow key={profile.id} profile={profile} />
                ))}
              </div>
            ) : (
              <p className="panel-copy">Featured student founders will appear here soon.</p>
            )}
          </section>
          <section className="discovery-panel">
            <p className="eyebrow">Why Moncem</p>
            <h3>Fast context. Real proof. Useful people.</h3>
            <p className="panel-copy">
              The web product should feel like a founder map, not another social feed.
            </p>
          </section>
        </aside>
      </section>

      <section className="shell section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Campus expansion</p>
            <h2 className="display-title">Find builders by school.</h2>
          </div>
          <p className="section-copy">
            Campus pages make Moncem local enough to matter and broad enough to grow.
          </p>
        </div>
        <Link href="/schools" className="button venture">
          Browse schools
        </Link>
      </section>
    </main>
  );
}
