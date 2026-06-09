import Link from 'next/link';
import Image from 'next/image';
import { ReactionBar } from '@/components/ReactionBar';
import {
  formatDate,
  formatStudentStatus,
  initialsFor,
  postTypeLabel,
  readingMinutes,
  usableCoverUrl,
} from '@/lib/format';
import type { PublicPost } from '@/lib/types';
import type { ReactionType } from '@/lib/types';

type PostCardVariant = 'compact' | 'feature' | 'list';

function postAccent(type: PublicPost['type']): string {
  if (type === 'build') return 'build';
  if (type === 'idea') return 'idea';
  if (type === 'demo') return 'demo';
  return 'journey';
}

function proofLine(post: PublicPost): string {
  if (post.milestone) return post.milestone;
  if (post.tags[0]) return post.tags[0];
  return 'Building in public';
}

export function PostCard({
  post,
  variant = 'compact',
  activeReactions = [],
  isAuthenticated = false,
}: {
  post: PublicPost;
  variant?: PostCardVariant;
  activeReactions?: ReactionType[];
  isAuthenticated?: boolean;
}) {
  const typeClass = post.type === 'journey' ? '' : post.type;
  const accent = postAccent(post.type);
  const authorInitials = initialsFor(post.author.fullName, post.author.username);
  const schoolLine = [post.author.school, formatStudentStatus(post.author.studentStatus)]
    .filter(Boolean)
    .join(' / ');
  const excerpt = post.excerpt ?? post.body?.slice(0, 150) ?? 'A student founder story from the build.';
  const coverUrl = usableCoverUrl(post.coverUrl);

  return (
    <article className={`post-card post-card-${variant} accent-${accent}`}>
      <Link href={`/p/${post.slug}`} className={`post-art post-art-link ${typeClass}`} aria-label={`Read ${post.title}`}>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes={variant === 'feature' ? '(max-width: 880px) 100vw, 56vw' : '(max-width: 880px) 100vw, 260px'}
          />
        ) : (
          <div className="proof-fallback" aria-hidden="true">
            <span>{post.title}</span>
          </div>
        )}
        <span className="type-label">{postTypeLabel(post.type)}</span>
      </Link>
      <div className="post-body">
        <div className="post-kicker">
          <span>{proofLine(post)}</span>
          <span>{readingMinutes(post.body)} min read</span>
        </div>
        <Link href={`/p/${post.slug}`} className="post-title-link">
          <h2>{post.title}</h2>
          <p>{excerpt}</p>
        </Link>
        <div className="post-meta">
          <span className="avatar avatar-small">{authorInitials}</span>
          <Link href={`/u/${post.author.username}`} className="post-author">
            <strong>{post.author.fullName}</strong>
            <span>{schoolLine || `@${post.author.username}`}</span>
          </Link>
          <span className="post-date">{formatDate(post.createdAt)}</span>
        </div>
        <ReactionBar
          postId={post.id}
          postSlug={post.slug}
          initialCounts={{
            sparked: post.sparkedCount,
            validated: post.validatedCount,
            inthis: post.inthisCount,
          }}
          initialActiveReactions={activeReactions}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </article>
  );
}
