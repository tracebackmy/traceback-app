'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, signOut, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { checkAdminStatus } from '@/lib/admin-auth' 
// CRITICAL FIX: Import UserRole from the dedicated type file
import { UserRole } from '@/types/admin' 

// Define constants for routing
const PROTECTED_USER_PATHS = ['/profile', '/report', '/dashboard']; 
const ADMIN_BASE_PATH = '/traceback-admin';
const VERIFY_EMAIL_PATH = '/auth/verify-email';

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  sendVerificationEmail: () => Promise<void>
  isEmailVerified: boolean
  uid: string | null; 
  email: string | null;
  role: UserRole | null; 
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  sendVerificationEmail: async () => {},
  isEmailVerified: false,
  uid: null,
  email: null,
  role: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null); 
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      
      if (currentUser) {
        
        // 1. CRITICAL: Role Check
        const userRole = await checkAdminStatus(currentUser);
        setRole(userRole);
        
        if (userRole === 'admin') {
          // A. ADMIN DETECTED
          setUser(null); 
          setLoading(false);
          
          if (!pathname.startsWith(ADMIN_BASE_PATH)) {
            router.push(`${ADMIN_BASE_PATH}/dashboard`);
          }
          return;
        } 
        
        // B. REGULAR USER DETECTED ('user' role)
        
        // Block regular users from admin routes
        if (pathname.startsWith(ADMIN_BASE_PATH)) {
            router.push('/');
            return;
        }

        // Handle Email Verification Flow
        const isVerified = currentUser.emailVerified;
        
        if (!isVerified && PROTECTED_USER_PATHS.includes(pathname)) {
            router.push(VERIFY_EMAIL_PATH);
        } else if (isVerified && pathname === VERIFY_EMAIL_PATH) {
            router.push('/dashboard');
        }

        // Set user for regular users only
        setUser(currentUser);
      
      } else {
        // 2. NO USER LOGGED IN
        
        // Redirect if unauthenticated user hits a protected path
        if (PROTECTED_USER_PATHS.includes(pathname) || pathname === VERIFY_EMAIL_PATH) {
          router.push('/auth/login'); 
        }
        
        setUser(null);
        setRole(null);
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
      } catch (error) {
        console.error('Error sending verification email:', error)
      }
    }
  }

  const isEmailVerified = user?.emailVerified || false
  const uid = user?.uid || null;
  const email = user?.email || null;


  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      logout, 
      sendVerificationEmail,
      isEmailVerified,
      uid, 
      email, 
      role 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}