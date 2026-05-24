import { useCallback, useEffect, useState } from 'react';
import { fetchFeed } from '../lib/queries';
import type { Post } from '../lib/types';

type FeedFilter = 'new' | 'top' | 'trending';

export function useFeed(filter: FeedFilter, userId = '') {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await fetchFeed(filter, userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [filter, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, error, refresh: load };
}
