import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

// Hardcoded admin credentials - ONLY these can access admin panel
const ADMIN_CREDENTIALS = [
  { email: 'tracebackfyp@gmail.com', password: 'swe/151/23b' }, // ⚠️ CHANGE THIS PASSWORD!
  // Add more admin accounts as needed
];

let currentAdmin: User | null = null;

export const adminSignIn = async (email: string, password: string) => {
  try {
    // First check against our hardcoded admin list
    const isValidAdmin = ADMIN_CREDENTIALS.some(cred => 
      cred.email === email && cred.password === password
    );

    if (!isValidAdmin) {
      throw new Error('Invalid admin credentials');
    }

    // Then sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentAdmin = userCredential.user;
    return currentAdmin;
  } catch (error) {
    console.error('Admin sign in error:', error);
    throw error;
  }
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

export const isAdminAuthenticated = (): boolean => {
  return currentAdmin !== null;
};

export const onAdminAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    // Only set as admin if they logged in through adminSignIn
    if (user && currentAdmin && user.uid === currentAdmin.uid) {
      callback(user);
    } else {
      callback(null);
    }
  });
};