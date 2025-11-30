import { useState, useEffect } from 'react';
import { db } from '@/services/mockFirebase';
import { ClaimRequest } from '@/types';
import { logger } from '@/lib/utils/logger';

export const useClaims = (userId?: string) => {
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
        let data: ClaimRequest[] = [];
        if (userId) {
          data = await db.getClaimsByUser(userId);
        } else {
          data = await db.getAllClaims();
        }
        setClaims(data);
      } catch (err) {
        logger.error('Failed to fetch claims', err);
        setError('Could not load claims.');
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, [userId]);

  return { claims, loading, error };
};