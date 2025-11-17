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

      if (user) {
        // FIRST: Check if user is an admin - MAINTAIN SEPARATION
        const isAdmin = await checkAdminStatus(user);
        console.log('🔍 AuthProvider: User admin status:', isAdmin);
        
        if (isAdmin) {
          console.log('🚨 AuthProvider: ADMIN DETECTED - NOT setting user in AuthProvider');
          // CRITICAL: Don't set user for admin in user context
          setUser(null);
          setLoading(false);
          
          // If admin is on user routes, redirect to admin dashboard
          if (!pathname.startsWith('/traceback-admin')) {
            console.log('📍 AuthProvider: Redirecting admin to admin dashboard');
            router.push('/traceback-admin/dashboard');
          }
          return;
        } else {
          console.log('👤 AuthProvider: Regular user detected');
          // Regular user - block from admin routes
          if (pathname.startsWith('/traceback-admin')) {
            console.log('🚫 AuthProvider: User trying to access admin route, redirecting to home');
            router.push('/');
            return;
          }

          // ORIGINAL LOGIC: Handle email verification for regular users
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
        // No user logged in
        console.log('👤 AuthProvider: No user logged in');
        
        const protectedPaths = ['/profile', '/report', '/dashboard']
        if (protectedPaths.includes(pathname)) {
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
      router.push('/')
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