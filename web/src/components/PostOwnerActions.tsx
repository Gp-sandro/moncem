'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DeleteResult = {
  ok?: boolean;
  error?: string;
};

type Props = {
  postId: string;
  postSlug: string;
  postTitle: string;
};

export function PostOwnerActions({ postId, postSlug, postTitle }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (deleting) return;

    const confirmed = window.confirm(`Delete "${postTitle}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      const result = (await response.json().catch(() => null)) as DeleteResult | null;

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
    <div className="owner-actions" aria-label="Post owner actions">
      <Link className="button secondary" href={`/post/${postSlug}/edit`}>
        Edit
      </Link>
      <button className="button danger" type="button" onClick={onDelete} disabled={deleting}>
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
      {error ? <span className="owner-actions-error">{error}</span> : null}
    </div>
  );
}
