'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { trackClientEvent } from '@/lib/analytics-client';
import type { ReactionType } from '@/lib/types';

type ReactionCounts = Record<ReactionType, number>;

type ToggleReactionResult = {
  counts?: ReactionCounts;
  activeReactions?: ReactionType[];
  error?: string;
};

const reactionOptions: Array<{
  type: ReactionType;
  label: string;
}> = [
  { type: 'sparked', label: 'Spark' },
  { type: 'validated', label: 'Validate' },
  { type: 'inthis', label: 'In this' },
];

export function ReactionBar({
  postId,
  postSlug,
  initialCounts,
  initialActiveReactions = [],
  isAuthenticated,
}: {
  postId: string;
  postSlug: string;
  initialCounts: ReactionCounts;
  initialActiveReactions?: ReactionType[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
  const [activeReactions, setActiveReactions] = useState<ReactionType[]>(initialActiveReactions);
  const [pendingType, setPendingType] = useState<ReactionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeSet = useMemo(() => new Set(activeReactions), [activeReactions]);

  async function toggleReaction(type: ReactionType) {
    if (!isAuthenticated) {
      router.push(`/join?next=${encodeURIComponent(`/p/${postSlug}`)}`);
      return;
    }

    if (pendingType) return;

    const wasActive = activeSet.has(type);
    const previousCounts = counts;
    const previousActive = activeReactions;

    setError(null);
    setPendingType(type);
    setActiveReactions((current) => (
      wasActive ? current.filter((item) => item !== type) : [...current, type]
    ));
    setCounts((current) => ({
      ...current,
      [type]: Math.max(0, current[type] + (wasActive ? -1 : 1)),
    }));

    try {
      const response = await fetch('/api/reactions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, type }),
      });
      const result = (await response.json().catch(() => null)) as ToggleReactionResult | null;

      if (!response.ok || !result?.counts || !result.activeReactions) {
        setCounts(previousCounts);
        setActiveReactions(previousActive);
        setError(result?.error ?? 'Could not save reaction.');
        setPendingType(null);
        return;
      }

      setCounts(result.counts);
      setActiveReactions(result.activeReactions);
      trackClientEvent('reaction_toggle', { type, active: !wasActive });
      setPendingType(null);
      router.refresh();
    } catch {
      setCounts(previousCounts);
      setActiveReactions(previousActive);
      setError('Could not reach the reaction server.');
      setPendingType(null);
    }
  }

  return (
    <div className="reaction-shell">
      <div className="reaction-bar" aria-label="Post reactions">
        {reactionOptions.map((reaction) => {
          const active = activeSet.has(reaction.type);
          return (
            <button
              key={reaction.type}
              type="button"
              className={`reaction-button ${active ? 'active' : ''}`}
              aria-pressed={active}
              disabled={pendingType !== null}
              onClick={() => toggleReaction(reaction.type)}
            >
              <span className={`reaction-glyph ${reaction.type}`} aria-hidden="true" />
              <strong>{counts[reaction.type]}</strong>
              <em>{reaction.label}</em>
            </button>
          );
        })}
      </div>
      {error ? <p className="inline-error">{error}</p> : null}
    </div>
  );
}
