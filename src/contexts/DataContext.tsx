'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Item, ClaimRequest, Ticket } from '@/types';

interface DataContextType {
  myItems: Item[];
  myClaims: ClaimRequest[];
  myTickets: Ticket[];
  loadingData: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
  myItems: [],
  myClaims: [],
  myTickets: [],
  loadingData: true,
  error: null,
  refreshData: async () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [myClaims, setMyClaims] = useState<ClaimRequest[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setMyItems([]);
      setMyClaims([]);
      setMyTickets([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setError(null);

    try {
      // Fetch all user-related data in parallel
      const [itemsRes, claimsRes, ticketsRes] = await Promise.all([
        fetch(`/api/items?userId=${user.uid}`),
        fetch(`/api/claims?userId=${user.uid}`),
        fetch(`/api/tickets?userId=${user.uid}`) // Ensure GET handler exists for this
      ]);

      if (!itemsRes.ok || !claimsRes.ok || !ticketsRes.ok) {
        throw new Error('Failed to fetch user data');
      }

      const itemsData = await itemsRes.json();
      const claimsData = await claimsRes.json();
      const ticketsData = await ticketsRes.json();

      setMyItems(itemsData.data || []);
      setMyClaims(claimsData.data || []);
      setMyTickets(ticketsData.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not load your data. Please try refreshing.');
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  // Initial fetch when user changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DataContext.Provider value={{ 
      myItems, 
      myClaims, 
      myTickets, 
      loadingData, 
      error,
      refreshData: fetchData 
    }}>
      {children}
    </DataContext.Provider>
  );
};