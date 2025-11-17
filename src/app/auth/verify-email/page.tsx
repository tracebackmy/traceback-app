'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { verifyEmail } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Wrap the component that uses useSearchParams
function VerifyEmailContent() {
  const { user, sendVerificationEmail, isEmailVerified } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const router = useRouter()
  const searchParams = useSearchParams()
  const oobCode = searchParams.get('oobCode')

  useEffect(() => {
    // Handle email verification from Firebase link
    const handleEmailVerification = async () => {
      if (oobCode) {
        setVerificationStatus('verifying')
        try {
          const result = await verifyEmail(oobCode)
          if (result.success) {
            setVerificationStatus('success')
            // Update user's email verification status in Firestore
            if (user) {
              await updateDoc(doc(db, 'users', user.uid), {
                emailVerified: true,
                updatedAt: new Date()
              })
            }
            // Reload user to get updated verification status
            setTimeout(() => {
              if (user) {
                user.reload()
                router.push('/profile')
              }
            }, 2000)
          } else {
            setVerificationStatus('error')
            setError('Failed to verify email. The link may have expired.')
          }
        } catch (err) {
          setVerificationStatus('error')
          setError('An error occurred during verification.')
          console.error('Email verification error:', err)
        }
      }
    }

    handleEmailVerification()
  }, [oobCode, user, router])

  useEffect(() => {
    // If user is not logged in and no oobCode, redirect to login
    if (!user && !oobCode) {
      router.push('/auth/login')
      return
    }

    // ORIGINAL BEHAVIOR: If email is already verified, redirect to profile
    if (isEmailVerified && !oobCode) {
      router.push('/profile')
    }
  }, [user, isEmailVerified, router, oobCode])

  const handleResendEmail = async () => {
    try {
      setSending(true)
      setError('')
      await sendVerificationEmail()
      setSent(true)
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
        await user.reload()
        // The AuthProvider will handle the redirect if email is verified
      } catch (err) {
        console.error('Error reloading user:', err)
      }
    }
  }

  // Show verification status when processing oobCode
  if (verificationStatus === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifying Your Email</h2>
          <p className="text-gray-600">Please wait while we verify your email address...</p>
        </div>
      </div>
    )
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified Successfully!</h2>
          <p className="text-gray-600 mb-4">Your email has been verified. Redirecting to your profile...</p>
          <Link href="/profile" className="bg-[#FF385C] text-white px-6 py-2 rounded-md hover:bg-[#E31C5F]">
            Go to Profile
          </Link>
        </div>
      </div>
    )
  }

  if (!user && !oobCode) {
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
            We&apos;ve sent a verification link to <strong>{user?.email}</strong>
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
            I&apos;ve Verified My Email
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

// Main component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h2>
          <p className="text-gray-600">Please wait while we load the verification page.</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}