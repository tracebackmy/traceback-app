import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
// CRITICAL FIX: Import all required types from the centralized type file
import { AdminUser, UserRole } from '@/types/admin'; 

import { ADMIN_USERS } from '@/config/admin'; 

// Helper function to check if email is designated admin (pre-auth check)
export const isAdminEmail = (email: string): boolean => {
  return ADMIN_USERS.some(admin => admin.email.toLowerCase() === email.toLowerCase());
};

/**
 * Performs the CRITICAL role check against Firestore.
 */
export const checkAdminStatus = async (user: User | null): Promise<UserRole | null> => {
  if (!user) {
    return null;
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data() as AdminUser;
      if (userData.role === 'admin') {
        return 'admin';
      }
    }
    // All authenticated, non-admin users get the 'user' role
    return 'user'; 
  } catch (error) {
    console.error('❌ Error checking user role:', error);
    return 'user'; 
  }
};

/**
 * Admin Sign In function. Performs initial email list check.
 */
export const adminSignIn = async (email: string, password: string): Promise<User> => {
  if (!isAdminEmail(email)) {
    throw new Error('Access denied. This is an admin-only login.');
  }
  
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const role = await checkAdminStatus(userCredential.user);

  if (role !== 'admin') {
      await signOut(auth);
      throw new Error('Access denied. Invalid administrator credentials.');
  }
  
  return userCredential.user;
};

/**
 * Admin Sign Out function.
 */
export const adminSignOut = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * Creates a dedicated listener for the AuthProvider/AdminProvider, checking both auth state and role.
 */
export const onAdminAuthStateChange = (callback: (user: User | null, role: UserRole | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const role = await checkAdminStatus(user);
      callback(user, role);
    } else {
      callback(null, null);
    }
  });
};