'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAdminAuthStateChange, adminSignOut, isAdminAuthenticated, getCurrentAdmin } from '@/lib/admin-auth';

interface AdminContextType {
  admin: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminContext = createContext<AdminContextType>({
  admin: null,
  loading: true,
  logout: async () => {},
  isAuthenticated: false,
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChange((user) => {
      setAdmin(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await adminSignOut();
      setAdmin(null);
    } catch (error) {
      console.error('Admin logout error:', error);
    }
  };

  const isAuthenticated = isAdminAuthenticated();

  return (
    <AdminContext.Provider value={{ 
      admin, 
      loading, 
      logout,
      isAuthenticated 
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);