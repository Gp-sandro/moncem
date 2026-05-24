'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
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

const promptOptions = [
  {
    label: 'What shipped?',
    body: 'What shipped? What changed because it exists now? What should another builder learn from it?',
  },
  {
    label: 'What broke?',
    body: 'What broke? What did you try first? What did the failure teach you?',
  },
  {
    label: 'What number moved?',
    body: 'What number moved? What caused it? What are you testing next?',
  },
  {
    label: 'What feedback do you need?',
    body: 'What decision are you stuck on? What context does another founder need before replying?',
  },
] as const;

type CreatePostResult = {
  slug?: string;
  error?: string;
};

type DeletePostResult = {
  ok?: boolean;
  error?: string;
};

type CoverUploadResult = {
  publicUrl?: string;
  path?: string;
  error?: string;
};

type PostComposerProps = {
  mode?: 'create' | 'edit';
  postId?: string;
  initialValues?: {
    type: PostType;
    title: string;
    excerpt: string;
    body: string;
    milestone: string;
    tags: string[];
    coverUrl: string;
    coverPath: string;
  };
};

export function PostComposer({ mode = 'create', postId, initialValues }: PostComposerProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [type, setType] = useState<PostType>(initialValues?.type ?? 'journey');
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [excerpt, setExcerpt] = useState(initialValues?.excerpt ?? '');
  const [body, setBody] = useState(initialValues?.body ?? '');
  const [milestone, setMilestone] = useState(initialValues?.milestone ?? '');
  const [tags, setTags] = useState(initialValues?.tags.join(', ') ?? '');
  const [coverUrl, setCoverUrl] = useState(initialValues?.coverUrl ?? '');
  const [coverPath, setCoverPath] = useState(initialValues?.coverPath ?? '');
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<(typeof promptOptions)[number] | null>(null);
  const trackedFirstInput = useRef(false);
  const isEdit = mode === 'edit';

  useEffect(() => {
    trackClientEvent('compose_view', { mode });
  }, [mode]);

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
  const canPublish = !publishBlocker && !submitting && !deleting;

  function trackFirstInput() {
    if (trackedFirstInput.current) return;
    trackedFirstInput.current = true;
    trackClientEvent('compose_first_input', { mode });
  }

  function onPromptSelect(prompt: (typeof promptOptions)[number]) {
    setSelectedPrompt(prompt);
    trackClientEvent('compose_prompt_selected', {
      mode,
      prompt: prompt.label,
    });
  }

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
    trackClientEvent('compose_publish_attempt', {
      mode,
      type,
      tag_count: tagList.length,
      has_cover: Boolean(coverUrl),
      has_milestone: Boolean(milestone.trim()),
      word_count: wordCount,
    });

    if (!canPublish) {
      setError('Add a title and at least a few sentences before publishing.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(isEdit && postId ? `/api/posts/${postId}` : '/api/posts', {
        method: isEdit ? 'PATCH' : 'POST',
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
        setError(result?.error ?? `Could not ${isEdit ? 'update' : 'publish'} this dispatch. Try again.`);
        setSubmitting(false);
        return;
      }

      if (!isEdit) {
        trackClientEvent('post_publish_success', {
          type,
          tag_count: tagList.length,
          has_cover: Boolean(coverUrl),
          word_count: wordCount,
        });
      }
      router.push(`/p/${result.slug}`);
      router.refresh();
    } catch {
      setError(`Could not reach the ${isEdit ? 'update' : 'publish'} server. Check your connection and try again.`);
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!isEdit || !postId || deleting) return;
    const confirmed = window.confirm(`Delete "${trimmedTitle || 'this dispatch'}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      const result = (await response.json().catch(() => null)) as DeletePostResult | null;

      if (!response.ok || !result?.ok) {
        setError(result?.error ?? 'Could not delete this dispatch. Try again.');
        setDeleting(false);
        return;
      }

      router.push('/feed');
      router.refresh();
    } catch {
      setError('Could not reach the delete server. Check your connection and try again.');
      setDeleting(false);
    }
  }

  return (
    <form className="composer composer-writing" onSubmit={onSubmit}>
      {error ? <div className="error">{error}</div> : null}

      <div className="composer-main">
        <div className="prompt-strip" aria-label="Writing prompts">
          {promptOptions.map((prompt) => (
            <button
              className={selectedPrompt?.label === prompt.label ? 'active' : undefined}
              key={prompt.label}
              type="button"
              onClick={() => onPromptSelect(prompt)}
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {selectedPrompt ? <p className="prompt-helper">{selectedPrompt.body}</p> : null}

        <label className="composer-title">
          <span className="sr-only">Title</span>
          <textarea
            rows={2}
            maxLength={150}
            placeholder="What changed this week?"
            value={title}
            onChange={(event) => {
              trackFirstInput();
              setTitle(event.target.value);
            }}
            required
          />
        </label>

        <label className="composer-excerpt">
          <span className="sr-only">Excerpt</span>
          <textarea
            rows={2}
            maxLength={240}
            placeholder="One sentence another builder would open."
            value={excerpt}
            onChange={(event) => {
              trackFirstInput();
              setExcerpt(event.target.value);
            }}
          />
        </label>

        <label className="composer-body">
          <span className="sr-only">Body</span>
          <textarea
            rows={12}
            maxLength={10000}
            placeholder={selectedPrompt?.body ?? 'What happened, what you tried, what moved, what you need next.'}
            value={body}
            onChange={(event) => {
              trackFirstInput();
              setBody(event.target.value);
            }}
            required
          />
        </label>
      </div>

      <details className="composer-rail" open>
        <summary>Dispatch settings</summary>
        <div className="rail-stack">
          <section className="rail-card">
            <p className="eyebrow">Good dispatch</p>
            <ul className="dispatch-checklist">
              <li>1 decision</li>
              <li>1 number</li>
              <li>1 ask</li>
            </ul>
          </section>

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
                <Image src={coverUrl} alt="" fill sizes="(max-width: 900px) 100vw, 320px" />
                <strong>Replace cover</strong>
              </span>
            ) : (
              <span className="cover-empty">
                <strong>{uploadingCover ? 'Uploading cover...' : 'Add cover image'}</strong>
                <small>JPEG, PNG, WebP, or HEIC. Max 5MB.</small>
              </span>
            )}
          </label>

          <div className="composer-utility">
            <label>
              <span>Proof</span>
              <input
                maxLength={150}
                placeholder="10 users, $120 MRR, 3 interviews, shipped v1"
                value={milestone}
                onChange={(event) => {
                  trackFirstInput();
                  setMilestone(event.target.value);
                }}
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

          {isEdit ? (
            <div className="danger-zone">
              <div>
                <strong>Delete this dispatch</strong>
                <span>Remove it from feeds, your profile, and all reader views.</span>
              </div>
              <button className="button danger" type="button" onClick={onDelete} disabled={deleting || submitting}>
                {deleting ? 'Deleting...' : 'Delete dispatch'}
              </button>
            </div>
          ) : null}
        </div>
      </details>

      <div className="composer-submit">
        <p>{publishBlocker ?? 'Ready when the lesson is clear.'}</p>
        <button className="button venture" type="submit" disabled={!canPublish}>
          {submitting ? (isEdit ? 'Saving...' : 'Publishing...') : null}
          {!submitting && uploadingCover ? 'Uploading cover...' : null}
          {!submitting && !uploadingCover ? (isEdit ? 'Save changes' : 'Publish dispatch') : null}
        </button>
      </div>
    </form>
  );
}
