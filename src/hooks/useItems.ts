import { useState, useEffect, useCallback } from 'react';
import { Item } from '@/types';
import { logger } from '@/lib/utils/logger';

interface UseItemsOptions {
  type?: 'lost' | 'found';
  status?: string;
  limit?: number;
  search?: string;
}

interface ApiResponse {
  success: boolean;
  data: Item[];
  pagination?: {
    lastId: string | null;
    hasMore: boolean;
  };
  error?: string;
}

export const useItems = ({ type, status, search, limit = 8 }: UseItemsOptions = {}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Fetch function (supports both initial load and pagination)
  const fetchItems = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      setError(null);

      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      params.append('limit', limit.toString());
      
      // Use the cursor if loading more
      if (isLoadMore && lastId) {
        params.append('lastId', lastId);
      }

      const response = await fetch(`/api/items?${params.toString()}`);
      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch items');
      }

      const newItems = result.data || [];
      const newLastId = result.pagination?.lastId || null;
      
      if (isLoadMore) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setLastId(newLastId);
      setHasMore(!!newLastId && newItems.length >= limit);

    } catch (err) {
      logger.error('Failed to fetch items', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [type, status, search, limit, lastId]);

  // Initial Fetch (Reset when filters change)
  useEffect(() => {
    // Reset state before fetching
    setItems([]);
    setLastId(null);
    setHasMore(true);
    fetchItems(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, search]); // Re-run when these filters change

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchItems(true);
    }
  };

  return { 
    items, 
    loading, 
    loadingMore,
    error, 
    hasMore, 
    loadMore, 
    refresh: () => fetchItems(false) 
  };
};