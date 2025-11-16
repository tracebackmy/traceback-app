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
  const [checkedRedirect, setCheckedRedirect] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setLoading(false)

      // Only run redirect logic once per auth state change
      if (!checkedRedirect) {
        if (user) {
          // Skip all redirect logic for admin routes
          const isAdminRoute = pathname.startsWith('/traceback-admin')
          
          if (isAdminRoute) {
            setCheckedRedirect(true)
            return // Don't do any redirects on admin routes
          }

          // For non-admin routes, handle email verification
          if (!user.emailVerified) {
            // Only redirect to verification if we're NOT already on verification or register pages
            if (pathname !== '/auth/verify-email' && pathname !== '/auth/register') {
              console.log('Redirecting to email verification')
              router.push('/auth/verify-email')
            }
          } else {
            // Email is verified, redirect away from auth pages to profile
            if (pathname === '/auth/verify-email' || pathname === '/auth/register' || pathname === '/auth/login') {
              router.push('/profile')
            }
          }
        } else {
          // No user, redirect away from protected pages
          const protectedPaths = ['/profile', '/report', '/dashboard']
          if (protectedPaths.includes(pathname)) {
            router.push('/')
          }
        }
        setCheckedRedirect(true)
      }
    })

    return () => unsubscribe()
  }, [router, pathname, checkedRedirect])

  const logout = async () => {
    try {
      await signOut(auth)
      setCheckedRedirect(false) // Reset redirect check on logout
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const sendVerificationEmail = async (): Promise<void> => {
    if (auth.currentUser) {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://traceback-app.vercel.app'
        await sendEmailVerification(auth.currentUser, {
          url: `${baseUrl}/profile`,
          handleCodeInApp: false
        })
        return
      } catch (error) {
        console.error('Error sending verification email:', error)
        return
      }
    }
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