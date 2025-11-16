import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

// List of admin emails (move to environment variables later)
const ADMIN_EMAILS = [
  'tracebackfyp@gmail.com',
  // Add more admin emails here
];

export const isAdminUser = (user: User | null): boolean => {
  return user ? ADMIN_EMAILS.includes(user.email || '') : false;
};

export const adminSignIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    if (!isAdminUser(userCredential.user)) {
      await signOut(auth);
      throw new Error('Access denied. Admin privileges required.');
    }
    
    return userCredential.user;
  } catch (error) {
    console.error('Admin sign in error:', error);
    throw error;
  }
};

export const adminSignOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Admin sign out error:', error);
    throw error;
  }
};

export const onAdminAuthStateChange = (callback: (user: User | null, isAdmin: boolean) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user, isAdminUser(user));
  });
};