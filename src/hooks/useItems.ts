import { useState, useEffect, useCallback } from 'react';
import { db } from '@/services/mockFirebase';
import { Item } from '@/types';
import { logger } from '@/lib/utils/logger';

interface UseItemsOptions {
  type?: 'lost' | 'found';
  status?: string;
  limit?: number;
}

export const useItems = ({ type, status, limit = 12 }: UseItemsOptions = {}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchItems = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const allItems = await db.getItems({ type, status });
      
      // Simulate server-side pagination since mockFirebase returns all
      const startIndex = reset ? 0 : (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = allItems.slice(0, endIndex); // Accumulate items for infinite scroll simulation

      if (reset) {
        setItems(paginatedItems);
        setPage(1);
      } else {
        setItems(paginatedItems);
      }

      setHasMore(endIndex < allItems.length);
      setLoading(false);
    } catch (err) {
      logger.error('Failed to fetch items', err);
      setError('Failed to load items. Please try again.');
      setLoading(false);
    }
  }, [type, status, limit, page]);

  useEffect(() => {
    fetchItems(true);
  }, [type, status]); // Reset when filters change

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  // Trigger effect when page changes to load more
  useEffect(() => {
    if (page > 1) {
      fetchItems();
    }
  }, [page, fetchItems]);

  return { items, loading, error, hasMore, loadMore, refresh: () => fetchItems(true) };
};