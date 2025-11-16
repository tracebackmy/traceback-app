import { User } from 'firebase/auth';

export interface AdminContextType {
  user: User | null;
  loading: boolean;
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