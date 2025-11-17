import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Admin users - stored in Firestore for security
const ADMIN_USERS = [
  { email: 'tracebackfyp@gmail.com', role: 'super-admin' },
];

let currentAdmin: User | null = null;
let adminCheckCompleted = false;

// Helper function to check if email is admin
const isAdminEmail = (email: string): boolean => {
  return ADMIN_USERS.some(admin => admin.email === email);
};

export const adminSignIn = async (email: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Admin sign in attempt:', email);
    
    // Check if email is in admin list
    if (!isAdminEmail(email)) {
      throw new Error('Invalid admin credentials');
    }

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Firebase auth successful, storing admin profile...');
    
    // Store admin profile in separate collection
    await setDoc(doc(db, 'admins', user.uid), {
      email: user.email,
      role: 'super-admin',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    currentAdmin = user;
    adminCheckCompleted = true;
    
    console.log('🎉 Admin sign in completed successfully - READY FOR REDIRECT');
    return user;
  } catch (error: unknown) {
    console.error('❌ Admin sign in error:', error);
    
    // Handle Firebase auth errors with proper typing
    if (error instanceof Error) {
      // Use type assertion for Firebase error codes
      const firebaseError = error as { code?: string; message: string };
      
      // Provide more specific error messages
      if (firebaseError.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (firebaseError.code === 'auth/user-not-found') {
        throw new Error('No account found with this email.');
      } else if (firebaseError.code === 'auth/wrong-password') {
        throw new Error('Incorrect password.');
      } else {
        throw new Error(firebaseError.message || 'Failed to sign in');
      }
    } else {
      throw new Error('An unexpected error occurred during sign in');
    }
  }
};

export const adminSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
    currentAdmin = null;
    adminCheckCompleted = false;
    console.log('👋 Admin signed out successfully');
  } catch (error: unknown) {
    console.error('❌ Admin sign out error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to sign out');
  }
};

export const getCurrentAdmin = (): User | null => {
  return currentAdmin;
};

export const isAdminAuthenticated = async (): Promise<boolean> => {
  if (!currentAdmin) {
    console.log('🔍 No current admin user');
    return false;
  }
  
  try {
    const adminDoc = await getDoc(doc(db, 'admins', currentAdmin.uid));
    const isAuthenticated = adminDoc.exists();
    console.log('🔐 Admin authentication check:', isAuthenticated, 'for user:', currentAdmin.email);
    return isAuthenticated;
  } catch (error) {
    console.error('❌ Error checking admin auth:', error);
    return false;
  }
};

export const checkAdminStatus = async (user: User | null): Promise<boolean> => {
  if (!user) {
    console.log('🔍 No user provided for admin check');
    return false;
  }
  
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    const isAdmin = adminDoc.exists();
    console.log('👤 Admin status check for', user.email, ':', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
};

export const onAdminAuthStateChange = (callback: (user: User | null, isAdmin: boolean) => void) => {
  console.log('🔄 Setting up admin auth state listener...');
  
  return onAuthStateChanged(auth, async (user) => {
    console.log('🔄 Auth state changed, user:', user?.email);
    
    if (user) {
      const isAdmin = await checkAdminStatus(user);
      console.log('🔍 Admin check result:', isAdmin);
      
      if (isAdmin) {
        currentAdmin = user;
        adminCheckCompleted = true;
        console.log('✅ Admin user detected:', user.email);
        callback(user, true);
      } else {
        currentAdmin = null;
        adminCheckCompleted = true;
        console.log('❌ User is not an admin:', user.email);
        callback(null, false);
      }
    } else {
      currentAdmin = null;
      adminCheckCompleted = true;
      console.log('👤 No user logged in');
      callback(null, false);
    }
  });
};

// Export the helper function for use in login page
export { isAdminEmail };