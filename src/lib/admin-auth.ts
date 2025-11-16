import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

export const adminSignIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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

export const onAdminAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};