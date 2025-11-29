'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VerifyEmailPage() {
  // Assuming useAuth provides isEmailVerified status check which is triggered by onAuthStateChanged reload
  const { user, sendVerificationEmail, isEmailVerified, loading: authLoading } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return;

    // 1. If user is not logged in, redirect to login
    if (!user) {
      router.push('/auth/login')
      return
    }

    // 2. If email is already verified, redirect to dashboard
    if (isEmailVerified) {
      router.push('/dashboard') // FIX: Redirect to /dashboard
    }
  }, [user, isEmailVerified, router, authLoading])

  const handleResendEmail = async () => {
    try {
      setSending(true)
      setError('')
      await sendVerificationEmail()
      setSent(true)
      // Hide the 'sent' message after a few seconds
      setTimeout(() => setSent(false), 5000) 
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Error sending verification email:', err)
    } finally {
      setSending(false)
    }
  }

  const handleCheckVerification = async () => {
    if (user) {
      try {
        // Force the Firebase token refresh to pick up the verification status
        await user.reload()
        // The AuthProvider listener will catch the change and handle the redirect
      } catch (err) {
        console.error('Error reloading user:', err)
      }
    }
  }

  // Loading/Unauthenticated UI remains the same
  if (!user || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to verify your email.</p>
          <Link href="/auth/login" className="bg-[#FF385C] text-white px-6 py-2 rounded-md hover:bg-[#E31C5F]">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ve sent a verification link to <strong>{user.email}</strong>
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            Please check your email and click the verification link to activate your account. 
            The link will expire in 24 hours.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {sent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              ✅ Verification email sent! Check your inbox.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleResendEmail}
            disabled={sending}
            className="w-full bg-[#FF385C] text-white py-3 px-4 rounded-md hover:bg-[#E31C5F] disabled:opacity-50 transition-colors duration-200"
          >
            {sending ? 'Sending...' : 'Resend Verification Email'}
          </button>
          
          <button
            onClick={handleCheckVerification}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors duration-200"
          >
            I&apos;ve Verified My Email (Click to Check Status)
          </button>

          <div className="text-center pt-4">
            <Link 
              href="/" 
              className="text-[#FF385C] hover:text-[#E31C5F] text-sm font-medium transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> If you don&apos;t see the email, check your spam folder. 
            It might take a few minutes to arrive.
          </p>
        </div>
      </div>
    </div>
  )
}