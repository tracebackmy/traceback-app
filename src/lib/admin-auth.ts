import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

let currentAdmin: User | null = null;
let adminCheckCompleted = false;

/**
 * Checks if a user document exists in the 'admins' collection.
 */
export const checkAdminStatus = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    // Strictly check the 'admins' collection. 
    // Security Rules will block this read if the user is not actually an admin,
    // creating a double layer of security.
    const adminDocRef = doc(db, 'admins', user.uid);
    const adminDoc = await getDoc(adminDocRef);
    
    return adminDoc.exists();
  } catch (error) {
    console.error('❌ Error verifying admin status:', error);
    return false;
  }
};

/**
 * Signs in a user and verifies they have admin privileges.
 */
export const adminSignIn = async (email: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Admin sign in attempt:', email);

    // 1. Standard Firebase Auth Login
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Verify Admin Status in Firestore
    const isAdmin = await checkAdminStatus(user);

    if (!isAdmin) {
      console.warn('🚨 User authenticated but not found in admins collection.');
      await signOut(auth); // Force logout
      throw new Error('Access denied. You do not have administrator privileges.');
    }

    currentAdmin = user;
    adminCheckCompleted = true;
    
    console.log('🎉 Admin authorized successfully');
    return user;
  } catch (error: any) {
    console.error('❌ Admin sign in error:', error);
    throw error; // Propagate error to UI
  }
};

export const adminSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
    currentAdmin = null;
    adminCheckCompleted = false;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const onAdminAuthStateChange = (callback: (user: User | null, isAdmin: boolean) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const isAdmin = await checkAdminStatus(user);
      if (isAdmin) {
        currentAdmin = user;
        adminCheckCompleted = true;
        callback(user, true);
      } else {
        currentAdmin = null;
        adminCheckCompleted = true;
        callback(null, false);
      }
    } else {
      currentAdmin = null;
      adminCheckCompleted = true;
      callback(null, false);
    }
  });
};