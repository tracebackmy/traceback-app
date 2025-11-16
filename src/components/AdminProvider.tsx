'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAdminAuthStateChange, adminSignOut } from '@/lib/admin-auth';

interface AdminContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await adminSignOut();
      setUser(null);
    } catch (error) {
      console.error('Admin logout error:', error);
    }
  };

  return (
    <AdminContext.Provider value={{ user, loading, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);