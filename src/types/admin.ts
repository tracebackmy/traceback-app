import { User } from 'firebase/auth';

export interface AdminUser extends User {
  adminSince: string;
  permissions: string[];
  lastActive?: string;
}

export interface AdminContextType {
  admin: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
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

export interface AdminPermission {
  id: string;
  name: string;
  description: string;
  granted: boolean;
}

export interface AdminActivity {
  id: string;
  action: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  details?: string;
}