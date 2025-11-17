'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAdminAuthStateChange, adminSignOut, checkAdminStatus } from '@/lib/admin-auth';

interface AdminContextType {
  admin: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AdminContext = createContext<AdminContextType>({
  admin: null,
  loading: true,
  logout: async () => {},
  isAuthenticated: false,
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChange((user, isAdmin) => {
      setAdmin(user);
      setIsAuthenticated(isAdmin);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await adminSignOut();
      setAdmin(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Admin logout error:', error);
    }
  };

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

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export default AdminProvider;