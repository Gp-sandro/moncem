'use client';

import Link from 'next/link';
import { trackClientEvent } from '@/lib/analytics-client';

export function FeedEmptyState() {
  return (
    <div className="empty empty-action feed-empty-state">
      <div>
        <p className="eyebrow">No dispatches yet</p>
        <h2>No dispatches yet.</h2>
        <p>Start with one thing that changed in your build this week.</p>
        <div className="empty-actions">
          <Link
            href="/post/new"
            className="button venture"
            onClick={() => trackClientEvent('feed_empty_cta_click', { action: 'write_dispatch' })}
          >
            Write a dispatch
          </Link>
          <a
            className="button secondary"
            href="mailto:?subject=Join%20Moncem%20beta&body=I%20think%20you%20should%20join%20Moncem%20for%20student%20founders:%20https://moncem.space"
            onClick={() => trackClientEvent('feed_empty_cta_click', { action: 'invite_founder' })}
          >
            Invite a founder
          </a>
        </div>
      </div>
    </div>
  );
}
