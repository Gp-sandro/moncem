import Link from 'next/link';
import { FieldCard } from '@/components/FieldCard';
import { FounderRow } from '@/components/FounderRow';
import { PostCard } from '@/components/PostCard';
import {
  getFeaturedProfiles,
  getRecentPosts,
  getSchoolSummaries,
} from '@/lib/data';
import { getActiveReactions } from '@/lib/interactions';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Student founder schools',
  description: 'Discover student founders by school on Moncem.',
};

export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [schools, profiles, posts] = await Promise.all([
    safeArray(getSchoolSummaries()),
    safeArray(getFeaturedProfiles(8)),
    safeArray(getRecentPosts(6)),
  ]);
  const activeReactions = user
    ? await getActiveReactions(supabase, user.id, posts.map((post) => post.id))
    : {};
  const campusCards = schools.slice(0, 4);

  return (
    <main className="discovery-page">
      <section className="shell compact-page-header">
        <div>
          <h1>Schools</h1>
          <p>Find student founders by campus.</p>
        </div>
      </section>

      <section className="shell section compact-section">
        {campusCards.length > 0 ? (
          <div className="field-grid-large">
            {campusCards.map((school, index) => (
              <FieldCard
                key={school.school}
                href={`/schools/${encodeURIComponent(school.school)}`}
                label={school.school}
                metric={`${school.count} ${school.count === 1 ? 'builder' : 'builders'}`}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="empty empty-action">
            <div>
              <p className="eyebrow">No schools yet</p>
              <h2>No campus activity yet.</h2>
              <p>School pages appear after student profiles include school names.</p>
              <Link href="/signup" className="button venture">
                Add your school
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="shell school-layout section">
        <aside className="discovery-sidebar">
          <section className="discovery-panel">
            <p className="eyebrow">Builders</p>
            <h3>People shipping across schools.</h3>
            {profiles.length > 0 ? (
              <div className="founder-list">
                {profiles.slice(0, 5).map((profile) => (
                  <FounderRow key={profile.id} profile={profile} />
                ))}
              </div>
            ) : (
              <p className="panel-copy">Featured student founders will appear here soon.</p>
            )}
          </section>
        </aside>
        <div className="stories">
          <div className="section-head">
            <Link href="/explore" className="button secondary">
              Explore all
            </Link>
          </div>
          {posts.length > 0 ? (
            posts.slice(0, 4).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                variant="list"
                activeReactions={activeReactions[post.id]}
                isAuthenticated={Boolean(user)}
              />
            ))
          ) : (
            <div className="empty">
              <p>School stories will appear here as student profiles fill in.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
