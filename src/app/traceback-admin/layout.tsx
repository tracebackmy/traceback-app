'use client';

import { AdminProvider, useAdmin } from '@/components/AdminProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import AdminNavbar from '@/components/AdminNavbar';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { admin, loading, isAuthenticated } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect to login if not authenticated as admin and not on login page
    if (!loading && !isAuthenticated && pathname !== '/traceback-admin/login') {
      router.push('/traceback-admin/login');
    }
    
    // Redirect to dashboard if authenticated as admin and on login page
    if (!loading && isAuthenticated && pathname === '/traceback-admin/login') {
      router.push('/traceback-admin/dashboard');
    }
  }, [loading, isAuthenticated, router, pathname]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // If not authenticated as admin and not on login page, show redirect
  if (!isAuthenticated && pathname !== '/traceback-admin/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to admin login...</p>
        </div>
      </div>
    );
  }

  // If on login page, don't show navbar
  if (pathname === '/traceback-admin/login') {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // Show full admin layout for authenticated admins
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}