import type { Metadata } from 'next';
import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { getPostsByTag } from '@/lib/data';
import { getActiveReactions } from '@/lib/interactions';
import { safeArray } from '@/lib/safe-data';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ tag: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `${decoded} student founder stories`,
    description: `Explore ${decoded} stories from student founders on Moncem.`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const decoded = decodeURIComponent(tag);
  const posts = await safeArray(getPostsByTag(decoded));
  const activeReactions = await getActiveReactions(supabase, user?.id, posts.map((post) => post.id));
  const [leadPost, ...restPosts] = posts;

  return (
    <main className="discovery-page">
      <section className="shell compact-page-header">
        <div>
          <h1>{decoded}</h1>
          <p>{posts.length} {posts.length === 1 ? 'dispatch' : 'dispatches'} from student founders.</p>
        </div>
      </section>
      <section className="shell feed-scroll section">
        <Link href="/explore" className="button secondary tag-back-link">
          Back to explore
        </Link>
      {leadPost ? (
        <>
          <PostCard
            post={leadPost}
            variant="feature"
            activeReactions={activeReactions[leadPost.id] ?? []}
            isAuthenticated={Boolean(user)}
          />
          {restPosts.map((post) => (
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
            <p className="eyebrow">No signal yet</p>
            <p>No public student founder stories match this tag yet.</p>
          </div>
        </div>
      )}
      </section>
    </main>
  );
}
