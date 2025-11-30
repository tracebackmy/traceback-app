import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { SystemUser, UserRole } from '@/types';

// Helper to map Firebase User to your SystemUser type
const mapUser = async (user: FirebaseUser): Promise<SystemUser | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data() as SystemUser;
    }
    // Fallback if user is in Auth but not Firestore (shouldn't happen in normal flow)
    return {
      uid: user.uid,
      email: user.email!,
      role: 'user', // Default role
      displayName: user.displayName || 'User',
      isVerified: false,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error("Error mapping user:", error);
    return null;
  }
};

export const AuthService = {
  // Login
  signIn: async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return mapUser(cred.user);
  },

  // Register
  signUp: async (email: string, pass: string, name: string, role: UserRole = 'user') => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Create User Document in Firestore
    const newUser: SystemUser = {
      uid: cred.user.uid,
      email: cred.user.email!,
      role,
      displayName: name,
      isVerified: false, 
      createdAt: Date.now(),
    };

    await setDoc(doc(db, 'users', cred.user.uid), newUser);
    await updateProfile(cred.user, { displayName: name });
    
    return newUser;
  },

  // Logout
  logout: async () => {
    await firebaseSignOut(auth);
  },

  // Auth Observer
  onAuthStateChanged: (callback: (user: SystemUser | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const systemUser = await mapUser(firebaseUser);
        callback(systemUser);
      } else {
        callback(null);
      }
    });
  }
};