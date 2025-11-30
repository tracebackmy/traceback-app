
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/services/mockFirebase';
import { SystemUser } from '@/types';

interface AuthContextType {
  user: SystemUser | null;
  loading: boolean;
  refreshUser: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: () => {},
  logout: async () => {},
  isAuthenticated: false,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = () => {
    const currentUser = db.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  };

  const logout = async () => {
    await db.logout();
    setUser(null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const value = {
    user,
    loading,
    refreshUser,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
