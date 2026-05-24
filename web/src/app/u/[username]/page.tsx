import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FounderProfileHeader } from '@/components/FounderProfileHeader';
import { PostCard } from '@/components/PostCard';
import { isUserEmailVerified } from '@/lib/auth';
import { getPostsByUsername, getProfileByUsername } from '@/lib/data';
import { getActiveReactions } from '@/lib/interactions';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ username: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Founder profile',
    description: 'Sign in to view this Moncem founder profile.',
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/join?next=${encodeURIComponent(`/u/${username}`)}`);
  }
  if (!isUserEmailVerified(user)) {
    redirect(`/verify-email?next=${encodeURIComponent(`/u/${username}`)}`);
  }

  const [profile, posts] = await Promise.all([
    getProfileByUsername(username),
    safeArray(getPostsByUsername(username)),
  ]);

  if (!profile) return notFound();
  const isOwnProfile = profile.id === user.id;
  const activeReactions = await getActiveReactions(supabase, user.id, posts.map((post) => post.id));

  return (
    <main className="shell section">
      <FounderProfileHeader profile={profile} posts={posts} currentUserId={user.id} />
      {isOwnProfile ? (
        <section className="profile-actions" aria-label="Profile account actions">
          <div>
            <p className="eyebrow">Account</p>
            <p>Edit your student-founder profile or sign out of this browser session.</p>
          </div>
          <div className="profile-action-buttons">
            <Link className="button venture" href="/settings/profile">
              Edit profile
            </Link>
            <form action="/auth/signout" method="post">
              <button className="button secondary" type="submit">
                Log out
              </button>
            </form>
          </div>
        </section>
      ) : null}
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Posts</p>
            <h2 className="page-title">Build history</h2>
          </div>
        </div>
        {posts.length > 0 ? (
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                activeReactions={activeReactions[post.id] ?? []}
                isAuthenticated
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>No public stories from this student founder yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}
