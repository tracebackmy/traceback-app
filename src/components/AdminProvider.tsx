'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAdminAuthStateChange, adminSignOut } from '@/lib/admin-auth';
import { AdminContextType, AdminUser } from '@/types/admin';

const AdminContext = createContext<AdminContextType>({
  admin: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChange((user, adminStatus) => {
      setAdmin(user as AdminUser);
      setIsAdmin(adminStatus);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await adminSignOut();
      setAdmin(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Admin logout error:', error);
    }
  };

  return (
    <AdminContext.Provider value={{ admin, loading, isAdmin, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);