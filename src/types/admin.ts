import { User } from 'firebase/auth';

export interface AdminContextType {
  admin: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export interface AdminStats {
  totalUsers: number;
  totalItems: number;
  openTickets: number;
  pendingClaims: number;
  lostItems: number;
  foundItems: number;
  recentActivity: number;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin';
  permissions: string[];
  lastLogin?: string;
}