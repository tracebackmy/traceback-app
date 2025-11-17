'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, signOut, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { checkAdminStatus } from '@/lib/admin-auth'

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
      console.log('🔄 AuthProvider: Auth state changed', { 
        user: user?.email, 
        pathname 
      });

      // CRITICAL FIX: Skip all processing for admin routes
      if (pathname.startsWith('/traceback-admin')) {
        console.log('🚨 AuthProvider: On admin route - SKIPPING user processing');
        setUser(null);
        setLoading(false);
        return;
      }

      if (user) {
        // FIRST: Check if user is an admin - COMPLETE SEPARATION
        const isAdmin = await checkAdminStatus(user);
        console.log('🔍 AuthProvider: User admin status:', isAdmin);
        
        if (isAdmin) {
          console.log('🚨 AuthProvider: ADMIN DETECTED - COMPLETELY IGNORING in user context');
          // CRITICAL: Don't set user AND don't redirect - let AdminProvider handle it
          setUser(null);
          setLoading(false);
          return;
        } else {
          console.log('👤 AuthProvider: Regular user detected');
          
          // Handle email verification for regular users ONLY
          if (!user.emailVerified) {
            const pagesThatRequireVerification = ['/profile', '/report', '/dashboard']
            if (pagesThatRequireVerification.includes(pathname)) {
              console.log('📧 AuthProvider: User not verified, redirecting to verification page');
              router.push('/auth/verify-email')
            }
          } else {
            if (pathname === '/auth/verify-email') {
              console.log('✅ AuthProvider: User verified, redirecting to profile');
              router.push('/profile')
            }
          }
          
          // Set user for regular users only
          setUser(user);
        }
      } else {
        // No user logged in - only handle user routes
        console.log('👤 AuthProvider: No user logged in');
        
        // Only redirect from user protected routes
        const userProtectedPaths = ['/profile', '/report', '/dashboard']
        if (userProtectedPaths.includes(pathname)) {
          console.log('🚫 AuthProvider: No user, redirecting from protected page to home');
          router.push('/')
        }
        
        setUser(null);
      }

      setLoading(false);
    })

    return () => unsubscribe()
  }, [router, pathname])

  const logout = async () => {
    try {
      await signOut(auth)
      // Only redirect user routes to home
      if (!pathname.startsWith('/traceback-admin')) {
        router.push('/')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const sendVerificationEmail = async (): Promise<void> => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser)
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