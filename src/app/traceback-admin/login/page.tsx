'use client';

import { useState } from 'react';
import { adminSignIn, isAdminEmail } from '@/lib/admin-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting admin login...');
      
      // FIRST: Check if this is actually an admin email BEFORE attempting login
      if (!isAdminEmail(email)) {
        console.log('🚨 Regular user attempting to login via admin page - BLOCKING');
        setError('Access denied. This login is for administrators only. Please use the user login page.');
        setLoading(false);
        return;
      }

      // SECOND: Attempt admin login
      await adminSignIn(email, password);
      console.log('✅ Admin login successful, redirecting to admin dashboard...');
      
      // Force redirect to admin dashboard
      router.push('/traceback-admin/dashboard');
      
    } catch (error: unknown) {
      console.error('❌ Admin login error:', error);
      if (error instanceof Error) {
        // Check if it's an "Invalid admin credentials" error (meaning not an admin)
        if (error.message === 'Invalid admin credentials') {
          setError('Access denied. This login is for administrators only.');
        } else {
          setError(error.message || 'Failed to sign in');
        }
      } else {
        setError('Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🔐 Admin Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Traceback Administration Panel
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className={`px-4 py-3 rounded ${
              error.includes('Access denied') 
                ? 'bg-red-50 border border-red-200 text-red-600' 
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Admin Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#FF385C] focus:border-[#FF385C] focus:z-10 sm:text-sm"
              placeholder="Enter admin email"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#FF385C] focus:border-[#FF385C] focus:z-10 sm:text-sm"
              placeholder="Enter password"
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#FF385C] hover:bg-[#E31C5F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF385C] disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in as Admin'}
            </button>
          </div>
          
          <div className="text-center">
            <Link 
              href="/"
              className="text-sm text-[#FF385C] hover:text-[#E31C5F]"
            >
              ← Back to Main Site
            </Link>
          </div>
        </form>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            <strong>⚠️ Restricted Access:</strong> This login is for authorized administrators only. 
            Regular users should use the main login page.
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Regular user?{' '}
            <Link href="/auth/login" className="font-medium text-[#FF385C] hover:text-[#E31C5F]">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}