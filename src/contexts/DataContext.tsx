
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/services/mockFirebase';
import { Item, ClaimRequest, Ticket } from '@/types';

interface DataContextType {
  myItems: Item[];
  myClaims: ClaimRequest[];
  myTickets: Ticket[];
  loadingData: boolean;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType>({
  myItems: [],
  myClaims: [],
  myTickets: [],
  loadingData: true,
  refreshData: () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [myClaims, setMyClaims] = useState<ClaimRequest[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) {
      setMyItems([]);
      setMyClaims([]);
      setMyTickets([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    // Subscribe to real-time data
    const unsubItems = db.subscribeToUserItems(user.uid, (items) => {
        setMyItems(items);
        setLoadingData(false);
    });

    const unsubClaims = db.subscribeToUserClaims(user.uid, (claims) => {
        setMyClaims(claims);
    });

    const unsubTickets = db.subscribeToUserTickets(user.uid, (tickets) => {
        setMyTickets(tickets);
    });

    return () => {
        unsubItems();
        unsubClaims();
        unsubTickets();
    };
  }, [user]);

  const refreshData = () => {
     // Mock manual refresh trigger if needed, though listeners handle it
  };

  return (
    <DataContext.Provider value={{ myItems, myClaims, myTickets, loadingData, refreshData }}>
      {children}
    </DataContext.Provider>
  );
};
