'use client';

import { useState } from 'react';
import { trackClientEvent } from '@/lib/analytics-client';

export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackClientEvent('post_share_copy', { title });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="share-row" aria-label="Share this dispatch">
      <button type="button" className="button venture" onClick={copyLink}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      <a
        className="button secondary"
        href={tweetHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClientEvent('post_share_x', { title })}
      >
        Share on X
      </a>
    </div>
  );
}
