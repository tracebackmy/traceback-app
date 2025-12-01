import { useState, useEffect } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Ticket } from '@/types';
import { logger } from '@/lib/utils/logger';

export const useTickets = (userId?: string) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        let data: Ticket[] = [];
        if (userId) {
          data = await db.getTicketsByUser(userId);
        } else {
          data = await db.getAllTickets();
        }
        setTickets(data.sort((a, b) => b.updatedAt - a.updatedAt));
      } catch (err) {
        logger.error('Failed to fetch tickets', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [userId]);

  return { tickets, loading };
};