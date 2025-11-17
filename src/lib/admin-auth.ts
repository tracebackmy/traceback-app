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
  // Add more admin emails as needed
];

let currentAdmin: User | null = null;

export const adminSignIn = async (email: string, password: string) => {
  try {
    // Check if email is in admin list
    const isAdminEmail = ADMIN_USERS.some(admin => admin.email === email);
    
    if (!isAdminEmail) {
      throw new Error('Invalid admin credentials');
    }

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Set custom claim for admin
    await setAdminCustomClaim(user.uid);
    
    // Store admin profile in separate collection
    await setDoc(doc(db, 'admins', user.uid), {
      email: user.email,
      role: 'super-admin',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    currentAdmin = user;
    return user;
  } catch (error) {
    console.error('Admin sign in error:', error);
    throw error;
  }
};

// Helper function to set custom claims (you'll need a Cloud Function for this)
// For now, we'll check admin status via Firestore
const setAdminCustomClaim = async (uid: string): Promise<void> => {
  // In production, you'd call a Cloud Function here
  // For now, we'll rely on Firestore checks
  console.log('Admin custom claim would be set for:', uid);
};

export const adminSignOut = async () => {
  try {
    await signOut(auth);
    currentAdmin = null;
  } catch (error) {
    console.error('Admin sign out error:', error);
    throw error;
  }
};

export const getCurrentAdmin = (): User | null => {
  return currentAdmin;
};

export const isAdminAuthenticated = async (): Promise<boolean> => {
  if (!currentAdmin) return false;
  
  // Check if user is in admin collection
  try {
    const adminDoc = await getDoc(doc(db, 'admins', currentAdmin.uid));
    return adminDoc.exists();
  } catch (error) {
    console.error('Error checking admin auth:', error);
    return false;
  }
};

export const checkAdminStatus = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const onAdminAuthStateChange = (callback: (user: User | null, isAdmin: boolean) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const isAdmin = await checkAdminStatus(user);
      if (isAdmin) {
        currentAdmin = user;
        callback(user, true);
      } else {
        currentAdmin = null;
        callback(null, false);
      }
    } else {
      currentAdmin = null;
      callback(null, false);
    }
  });
};