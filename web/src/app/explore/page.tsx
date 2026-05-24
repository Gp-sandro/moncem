import Link from 'next/link';
import { FieldCard } from '@/components/FieldCard';
import { FounderRow } from '@/components/FounderRow';
import { PostCard } from '@/components/PostCard';
import { getFeaturedProfiles, getRecentPosts, getTopicSummaries } from '@/lib/data';
import { getActiveReactions } from '@/lib/interactions';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Explore student founder stories',
  description: 'Browse student founder stories, demos, ideas, and proof on Moncem.',
};

export const dynamic = 'force-dynamic';

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [posts, profiles, topics] = await Promise.all([
    safeArray(getRecentPosts(12)),
    safeArray(getFeaturedProfiles(6)),
    safeArray(getTopicSummaries()),
  ]);
  const activeReactions = await getActiveReactions(supabase, user?.id, posts.map((post) => post.id));
  const primaryTopics = topics.slice(0, 4);
  const [leadPost, ...restPosts] = posts;

  return (
    <main className="discovery-page">
      <section className="shell compact-page-header">
        <div>
          <h1>Explore</h1>
          <p>Fields, proof, and builders worth opening.</p>
        </div>
      </section>

      <section className="shell section compact-section">
        {primaryTopics.length > 0 ? (
          <div className="field-grid-large">
            {primaryTopics.map((topic, index) => (
              <FieldCard
                key={topic.tag}
                href={`/explore/${encodeURIComponent(topic.tag)}`}
                label={topic.tag}
                metric={`${topic.count} ${topic.count === 1 ? 'story' : 'stories'}`}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>Topics will appear once public posts are tagged.</p>
          </div>
        )}
      </section>

      <section className="shell discovery-layout section">
        <div className="stories">
          {leadPost ? (
            <>
              <PostCard
                post={leadPost}
                variant="feature"
                activeReactions={activeReactions[leadPost.id] ?? []}
                isAuthenticated={Boolean(user)}
              />
              {restPosts.slice(0, 5).map((post) => (
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
              <p>No stories yet. The first student founder dispatches will land here.</p>
            </div>
          )}
        </div>
        <aside className="discovery-sidebar">
          <section className="discovery-panel">
            <p className="eyebrow">Builders</p>
            <h3>People shipping early.</h3>
            {profiles.length > 0 ? (
              <div className="founder-list">
                {profiles.slice(0, 4).map((profile) => (
                  <FounderRow key={profile.id} profile={profile} />
                ))}
              </div>
            ) : (
              <p className="panel-copy">Featured student founders will appear here soon.</p>
            )}
          </section>
          <section className="discovery-panel">
            <p className="eyebrow">Interests</p>
            {topics.length > 0 ? (
              <div className="chip-list">
                {topics.map((topic) => (
                  <Link key={topic.tag} href={`/explore/${encodeURIComponent(topic.tag)}`} className="chip">
                    {topic.tag} / {topic.count}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="panel-copy">Topics will appear once posts are tagged.</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
