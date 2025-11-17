'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { checkAdminStatus } from '@/lib/admin-auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      setLoading(true)
      console.log('🔐 Attempting user login...');
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user;
      
      // CRITICAL: Check if this user is an admin
      const isAdmin = await checkAdminStatus(user);
      console.log('🔍 Login check: Is admin?', isAdmin);
      
      if (isAdmin) {
        console.log('🚨 ADMIN detected in user login - redirecting to admin dashboard');
        // If admin logs in via user login page, redirect to admin dashboard
        router.push('/traceback-admin/dashboard');
        return;
      }
      
      console.log('✅ Regular user login successful - going to user dashboard');
      router.push('/dashboard')
    } catch (error: unknown) {
      console.error('❌ User login error:', error);
      if (error instanceof Error) {
        setError(error.message || 'Failed to sign in')
      } else {
        setError('Failed to sign in')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/register" className="font-medium text-[#FF385C] hover:text-[#E31C5F]">
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
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
              placeholder="Enter your email"
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
              placeholder="Enter your password"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#FF385C] hover:bg-[#E31C5F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF385C] disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Admin?{' '}
              <Link href="/traceback-admin/login" className="font-medium text-[#FF385C] hover:text-[#E31C5F]">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}