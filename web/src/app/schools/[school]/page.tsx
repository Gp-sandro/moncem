import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FounderRow } from '@/components/FounderRow';
import { PostCard } from '@/components/PostCard';
import {
  getPostsBySchool,
  getProfilesBySchool,
} from '@/lib/data';
import { isSchoolsEnabled } from '@/lib/env';
import { getActiveReactions } from '@/lib/interactions';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ school: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { school } = await params;
  const decoded = decodeURIComponent(school);
  return {
    title: `${decoded} student founders`,
    description: `Discover student founders, stories, and proof from ${decoded} on Moncem.`,
  };
}

export default async function SchoolPage({ params }: Props) {
  if (!isSchoolsEnabled()) notFound();
  const { school } = await params;
  const decoded = decodeURIComponent(school);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [profiles, posts] = await Promise.all([
    safeArray(getProfilesBySchool(decoded)),
    safeArray(getPostsBySchool(decoded)),
  ]);
  const activeReactions = user
    ? await getActiveReactions(supabase, user.id, posts.map((post) => post.id))
    : {};
  const hasSchoolData = profiles.length > 0 || posts.length > 0;

  return (
    <main className="discovery-page">
      <section className="shell compact-page-header">
        <div>
          <h1>{decoded}</h1>
          <p>
            {hasSchoolData ? 'Builders, stories, and proof from this school.' : 'No builders are listed here yet.'}
          </p>
        </div>
      </section>

      <section className="shell school-layout section">
        <aside className="discovery-sidebar">
          <section className="discovery-panel">
            <p className="eyebrow">Filters</p>
            <h3>Find your corner.</h3>
            <div className="chip-list">
              <Link className="chip" href="/connect">Open to connect</Link>
              <Link className="chip" href="/explore/AI">AI and agents</Link>
              <Link className="chip" href="/explore/SaaS">SaaS</Link>
              <Link className="chip" href="/explore/Health">Health tech</Link>
            </div>
          </section>
          <section className="discovery-panel">
            <p className="eyebrow">Builders</p>
            <h3>Start with people shipping.</h3>
            {profiles.length > 0 ? (
              <div className="founder-list">
                {profiles.slice(0, 5).map((profile) => (
                  <FounderRow key={profile.id} profile={profile} />
                ))}
              </div>
            ) : (
              <p className="panel-copy">No builders from this school yet.</p>
            )}
          </section>
        </aside>

        <div className="stories">
          <div className="section-head">
            <Link href="/schools" className="button secondary">
              All schools
            </Link>
          </div>
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                variant={index === 0 ? 'feature' : 'list'}
                activeReactions={activeReactions[post.id]}
                isAuthenticated={Boolean(user)}
              />
            ))
          ) : (
            <div className="empty empty-action">
              <div>
                <p className="eyebrow">No builders here yet</p>
                <p>No public stories from {decoded} are listed on Moncem yet.</p>
                <Link href="/schools" className="button secondary">
                  Browse other schools
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
