
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Toast } from '@/components/ui/Toast';

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  showToast: () => {},
  markAsRead: () => {},
  clearAll: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'error' | 'info'}[]>([]);

  useEffect(() => {
    if (user) {
      // Subscribe to real-time system notifications (e.g. emails/alerts)
      const unsub = db.subscribeToNotifications(user.uid, (message) => {
          const newNote: Notification = {
              id: Date.now().toString(),
              message,
              read: false,
              timestamp: Date.now()
          };
          setNotifications(prev => [newNote, ...prev]);
          showToast(message, 'info');
      });
      return () => unsub();
    }
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, showToast, markAsRead, clearAll }}>
      {children}
      {/* Toast Render Layer */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
