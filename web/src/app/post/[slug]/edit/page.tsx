import { notFound, redirect } from 'next/navigation';
import { PostComposer } from '@/components/PostComposer';
import { isUserEmailVerified } from '@/lib/auth';
import { coverPathFromPublicUrl } from '@/lib/post-validation';
import { createClient } from '@/lib/supabase/server';
import type { PostType } from '@/lib/types';

type Props = {
  params: Promise<{ slug: string }>;
};

type EditablePostRow = {
  id: string;
  author_id: string;
  type: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  milestone: string | null;
  tags: string[] | null;
};

const postTypes = new Set<PostType>(['journey', 'build', 'idea', 'demo']);

export const metadata = {
  title: 'Edit dispatch',
};

export const dynamic = 'force-dynamic';

function asPostType(value: string): PostType {
  return postTypes.has(value as PostType) ? (value as PostType) : 'journey';
}

export default async function EditPostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const next = `/post/${slug}/edit`;

  if (!user) {
    redirect(`/join?next=${encodeURIComponent(next)}`);
  }
  if (!isUserEmailVerified(user)) {
    redirect(`/verify-email?next=${encodeURIComponent(next)}`);
  }

  const { data, error } = await supabase
    .from('posts')
    .select('id, author_id, type, title, excerpt, body, cover_url, milestone, tags')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Edit post lookup failed', error);
    return notFound();
  }

  const post = data as EditablePostRow | null;
  if (!post || post.author_id !== user.id) {
    return notFound();
  }

  return (
    <main className="composer-page">
      <section className="shell composer-hero">
        <div>
          <p className="eyebrow">Edit dispatch</p>
          <h1>Tighten the story without losing the proof.</h1>
        </div>
        <p>
          Update the lesson, proof, tags, or cover. Readers should still leave with one clear
          builder insight.
        </p>
      </section>
      <section className="shell">
        <PostComposer
          mode="edit"
          postId={post.id}
          initialValues={{
            type: asPostType(post.type),
            title: post.title,
            excerpt: post.excerpt ?? '',
            body: post.body ?? '',
            milestone: post.milestone ?? '',
            tags: post.tags ?? [],
            coverUrl: post.cover_url ?? '',
            coverPath: coverPathFromPublicUrl(post.cover_url, user.id) ?? '',
          }}
        />
      </section>
    </main>
  );
}
