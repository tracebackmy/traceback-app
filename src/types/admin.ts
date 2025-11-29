import { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

// CRITICAL FIX: Define and export UserRole here.
export type UserRole = 'admin' | 'user';

// Interface for Firestore document under /users
export interface SystemUser {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole; // Must be 'user' by default
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
}

// Updated context type to expose user role and full details
export interface AdminContextType {
  admin: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  uid: string | null;
  email: string | null;
  role: UserRole | null;
}

// Keeping AdminUser for existing component compatibility
export interface AdminUser {
  uid: string;
  email: string;
  role: UserRole;
  permissions: string[];
  lastLogin?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalItems: number;
  openTickets: number;
  pendingClaims: number;
  lostItems: number;
  foundItems: number;
  recentActivity: number;
  pendingVerificationItems: number;
}