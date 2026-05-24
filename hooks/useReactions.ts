import { useEffect, useRef, useState } from 'react';
import { toggleReaction } from '../lib/queries';
import type { ReactionCounts, ReactionType } from '../lib/types';

interface UseReactionsResult {
  counts: ReactionCounts;
  userReactions: ReactionType[];
  toggle: (type: ReactionType) => Promise<void>;
}

export function useReactions(
  userId: string,
  postId: string,
  initialCounts: ReactionCounts,
  initialUserReactions: ReactionType[],
): UseReactionsResult {
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
  const [userReactions, setUserReactions] = useState<ReactionType[]>(initialUserReactions);
  const pendingRef = useRef<Set<ReactionType>>(new Set());

  useEffect(() => {
    setCounts(initialCounts);
    setUserReactions(initialUserReactions);
    pendingRef.current.clear();
  }, [postId, initialCounts.sparked, initialCounts.validated, initialCounts.inthis, initialUserReactions.join('|')]);

  async function toggle(type: ReactionType): Promise<void> {
    if (!userId) return;
    if (pendingRef.current.has(type)) return;
    pendingRef.current.add(type);

    const isActive = userReactions.includes(type);

    // Optimistic update
    setUserReactions((prev) =>
      isActive ? prev.filter((r) => r !== type) : [...prev, type],
    );
    setCounts((prev) => ({
      ...prev,
      [type]: Math.max(0, prev[type] + (isActive ? -1 : 1)),
    }));

    try {
      await toggleReaction(userId, postId, type);
    } catch {
      // Rollback on failure
      setUserReactions((prev) =>
        isActive ? [...prev, type] : prev.filter((r) => r !== type),
      );
      setCounts((prev) => ({
        ...prev,
        [type]: Math.max(0, prev[type] + (isActive ? 1 : -1)),
      }));
    } finally {
      pendingRef.current.delete(type);
    }
  }

  return { counts, userReactions, toggle };
}
