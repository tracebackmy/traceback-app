import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

// Separate admin authentication - completely independent from user auth
let adminUser: User | null = null;

export const adminSignIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    adminUser = userCredential.user;
    return adminUser;
  } catch (error) {
    console.error('Admin sign in error:', error);
    throw error;
  }
};

export const adminSignOut = async () => {
  try {
    await signOut(auth);
    adminUser = null;
  } catch (error) {
    console.error('Admin sign out error:', error);
    throw error;
  }
};

export const getCurrentAdmin = (): User | null => {
  return adminUser;
};

export const isAdminAuthenticated = (): boolean => {
  return adminUser !== null;
};

export const onAdminAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    adminUser = user;
    callback(user);
  });
};