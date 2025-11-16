'use client';

import { AdminProvider, useAdmin } from '@/components/AdminProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Simple Admin Navbar
function AdminNavbar() {
  const { admin, logout } = useAdmin();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/traceback-admin/dashboard' },
    { name: 'Items', href: '/traceback-admin/items' },
    { name: 'Tickets', href: '/traceback-admin/tickets' },
    { name: 'Users', href: '/traceback-admin/users' },
    { name: 'CCTV', href: '/traceback-admin/cctv' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/traceback-admin/dashboard" className="flex items-center">
              <Image 
                src="/TRACEBACK.png" 
                alt="Traceback Logo" 
                width={32} 
                height={32} 
                className="mr-2"
              />
              <span className="text-xl font-bold text-[#FF385C]">
                Traceback Admin
              </span>
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-[#FF385C] text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {admin?.email}
            </span>
            <Link 
              href="/"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Main Site
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { admin, loading, isAdmin } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and not admin, redirect to login
    // But ONLY if we're not already on the login page
    if (!loading && !isAdmin && pathname !== '/traceback-admin/login') {
      console.log('Redirecting to login: not admin');
      router.push('/traceback-admin/login');
    }
    
    // If admin is verified and on login page, redirect to dashboard
    if (!loading && isAdmin && pathname === '/traceback-admin/login') {
      console.log('Redirecting to dashboard: admin verified');
      router.push('/traceback-admin/dashboard');
    }
  }, [loading, isAdmin, router, pathname]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // If we're on login page, just show the login form
  if (pathname === '/traceback-admin/login') {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // If not admin and not on login page, show redirect message
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to admin login...</p>
        </div>
      </div>
    );
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