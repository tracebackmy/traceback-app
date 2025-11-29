'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAdminAuthStateChange, adminSignOut } from '@/lib/admin-auth'; 
import { UserRole, AdminContextType } from '@/types/admin'; 
import { useRouter, usePathname } from 'next/navigation';


const ADMIN_BASE_PATH = '/traceback-admin';

// NOTE: AdminContextType is defined in src/types/admin.ts
export const AdminContext = createContext<AdminContextType>({
  admin: null,
  loading: true,
  logout: async () => {},
  isAuthenticated: false,
  uid: null,
  email: null,
  role: null
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Path check: If we are not on an admin path, we stop here.
    // The component should only be mounted on admin routes by the RootLayout,
    // but this check handles edge cases/direct access.
    if (!pathname.startsWith(ADMIN_BASE_PATH)) {
        // If we are mounted where we shouldn't be, ensure we stop any further processing
        // and let the parent layout handle the loading state/unmounting.
        // We AVOID synchronous setState here entirely.
        return; 
    }

    // 2. Asynchronous Auth Listener (runs only on admin paths)
    const unsubscribe = onAdminAuthStateChange((user, userRole) => {
      setAdmin(user);
      setRole(userRole);
      
      const isAuth = !!user && userRole === 'admin';
      setIsAuthenticated(isAuth);
      
      // Setting loading to false here is safe as it's triggered by the external state change callback
      setLoading(false); 

      if (!user && pathname !== `${ADMIN_BASE_PATH}/login`) {
          router.push(`${ADMIN_BASE_PATH}/login`);
          return;
      }

      if (user && userRole !== 'admin') {
          adminSignOut(); 
          router.push('/'); 
          return;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router, pathname]); // Removed 'loading' from dependency array as it's set internally

  const logout = async () => {
    try {
      await adminSignOut();
      setAdmin(null);
      setIsAuthenticated(false);
      router.push(`${ADMIN_BASE_PATH}/login`);
    } catch (error) {
      console.error('Admin logout error:', error);
    }
  };

  const value = {
    admin, 
    loading, 
    logout,
    isAuthenticated,
    uid: admin?.uid || null,
    email: admin?.email || null,
    role
  };

  return (
    <AdminContext.Provider value={value}>
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