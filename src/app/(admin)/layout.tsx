'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect unauthenticated users to login
        router.replace('/login');
      } else if (!isAdmin) {
        // Redirect authenticated non-admins to user dashboard
        router.replace('/dashboard');
      }
    }
  }, [user, loading, isAdmin, router]);

  // Show loading spinner while checking auth
  if (loading || (user && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand"></div>
          <p className="text-muted font-medium text-sm">Verifying Admin Privileges...</p>
        </div>
      </div>
    );
  }

  // Double check to prevent flash of content
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar isAdmin={true} />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}