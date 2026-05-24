'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { trackClientEvent } from '@/lib/analytics-client';
import type { PostType } from '@/lib/types';

const typeOptions: Array<{
  value: PostType;
  label: string;
  hint: string;
}> = [
  { value: 'journey', label: 'Journey', hint: 'What changed, broke, or finally worked.' },
  { value: 'build', label: 'Build', hint: 'Progress, systems, experiments, decisions.' },
  { value: 'idea', label: 'Idea', hint: 'A sharp problem and why it matters now.' },
  { value: 'demo', label: 'Demo', hint: 'Show the product, prototype, or launch.' },
];

type CreatePostResult = {
  slug?: string;
  error?: string;
};

type CoverUploadResult = {
  publicUrl?: string;
  path?: string;
  error?: string;
};

export function PostComposer() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [type, setType] = useState<PostType>('journey');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [milestone, setMilestone] = useState('');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPath, setCoverPath] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tagList = useMemo(
    () => tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 5),
    [tags],
  );
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const wordCount = trimmedBody ? trimmedBody.split(/\s+/).length : 0;
  const publishBlocker = !trimmedTitle
    ? 'Add a title before publishing.'
    : trimmedBody.length < 40
      ? `Write ${40 - trimmedBody.length} more characters in the body.`
      : uploadingCover
        ? 'Wait for the cover upload to finish.'
        : null;
  const canPublish = !publishBlocker && !submitting;

  async function onCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/cover', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as CoverUploadResult | null;

      if (!response.ok || !result?.publicUrl || !result.path) {
        setError(result?.error ?? 'Could not upload this cover image. Try another file.');
        setCoverUrl('');
        setCoverPath('');
        setUploadingCover(false);
        return;
      }

      setCoverUrl(result.publicUrl);
      setCoverPath(result.path);
      setUploadingCover(false);
    } catch {
      setError('Could not reach the upload server. Check your connection and try again.');
      setUploadingCover(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canPublish) {
      setError('Add a title and at least a few sentences before publishing.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          excerpt,
          body,
          milestone,
          tags: tagList,
          coverUrl,
          coverPath,
        }),
      });
      const result = (await response.json().catch(() => null)) as CreatePostResult | null;

      if (!response.ok || !result?.slug) {
        setError(result?.error ?? 'Could not publish this dispatch. Try again.');
        setSubmitting(false);
        return;
      }

      trackClientEvent('post_publish_success', {
        type,
        tag_count: tagList.length,
        has_cover: Boolean(coverUrl),
        word_count: wordCount,
      });
      router.push(`/p/${result.slug}`);
      router.refresh();
    } catch {
      setError('Could not reach the publish server. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  return (
    <form className="composer" onSubmit={onSubmit}>
      {error ? <div className="error">{error}</div> : null}

      <fieldset className="type-grid" aria-label="Post type">
        {typeOptions.map((option) => (
          <label className={`type-option ${type === option.value ? 'selected' : ''}`} key={option.value}>
            <input
              type="radio"
              name="type"
              value={option.value}
              checked={type === option.value}
              onChange={() => setType(option.value)}
            />
            <span>{option.label}</span>
            <small>{option.hint}</small>
          </label>
        ))}
      </fieldset>

      <label className={`cover-upload ${coverUrl ? 'has-cover' : ''}`}>
        <span>Cover image</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={onCoverChange} />
        {coverUrl ? (
          <span className="cover-preview" aria-label="Uploaded cover preview">
            <Image src={coverUrl} alt="" fill sizes="(max-width: 900px) 100vw, 900px" />
            <strong>Replace cover</strong>
          </span>
        ) : (
          <span className="cover-empty">
            <strong>{uploadingCover ? 'Uploading cover...' : 'Add cover image'}</strong>
            <small>JPEG, PNG, WebP, or HEIC. Max 5MB.</small>
          </span>
        )}
      </label>

      <label className="composer-title">
        <span className="sr-only">Title</span>
        <textarea
          rows={2}
          maxLength={150}
          placeholder="Title your dispatch"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </label>

      <label className="composer-excerpt">
        <span className="sr-only">Excerpt</span>
        <textarea
          rows={2}
          maxLength={240}
          placeholder="One sentence that makes another builder want to open this."
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
        />
      </label>

      <label className="composer-body">
        <span className="sr-only">Body</span>
        <textarea
          rows={12}
          maxLength={10000}
          placeholder="Write what really happened. The decision, the number, the failed attempt, the lesson."
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
        />
      </label>

      <div className="composer-utility">
        <label>
          <span>Proof</span>
          <input
            maxLength={150}
            placeholder="$4.2k MRR, 50 users, shipped v1"
            value={milestone}
            onChange={(event) => setMilestone(event.target.value)}
          />
        </label>
        <label>
          <span>Tags</span>
          <input
            placeholder="AI, SaaS, UC Davis"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </label>
        <div className="composer-count">
          <span>{wordCount}w</span>
          <small>{tagList.length}/5 tags</small>
        </div>
      </div>

      <div className="composer-submit">
        <p>{publishBlocker ?? 'Publish a dispatch when there is one clear thing another student founder can learn.'}</p>
        <button className="button venture" type="submit" disabled={!canPublish}>
          {submitting ? 'Publishing...' : uploadingCover ? 'Uploading cover...' : 'Publish dispatch'}
        </button>
      </div>
    </form>
  );
}
