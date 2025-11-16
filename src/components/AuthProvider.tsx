'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, signOut, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  sendVerificationEmail: () => Promise<void>
  isEmailVerified: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  sendVerificationEmail: async () => {},
  isEmailVerified: false
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setLoading(false)

      if (user) {
        // Check if email is verified
        if (!user.emailVerified) {
          // Redirect to verification page if not on verification page already
          if (pathname !== '/auth/verify-email' && pathname !== '/auth/register') {
            router.push('/auth/verify-email')
          }
        } else {
          // Email is verified, redirect to profile if on auth pages
          if (pathname === '/auth/verify-email' || pathname === '/auth/register') {
            router.push('/profile')
          }
        }
      } else {
        // No user, redirect to home if on protected pages
        const protectedPaths = ['/profile', '/report', '/dashboard']
        if (protectedPaths.includes(pathname)) {
          router.push('/')
        }
      }
    })

    return () => unsubscribe()
  }, [router, pathname])

  const logout = async () => {
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const sendVerificationEmail = async (): Promise<void> => {
    if (auth.currentUser) {
      try {
        // Get the current domain for the verification link
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://traceback-app.vercel.app'
        await sendEmailVerification(auth.currentUser, {
          url: `${baseUrl}/profile`,
          handleCodeInApp: false
        })
        // Don't return anything (void)
        return
      } catch (error) {
        console.error('Error sending verification email:', error)
        // Don't return anything (void)
        return
      }
    }
    // Don't return anything (void)
    return
  }

  const isEmailVerified = user?.emailVerified || false

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      logout, 
      sendVerificationEmail,
      isEmailVerified 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)