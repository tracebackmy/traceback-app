
export interface DashboardStats {
  totalLost: number;
  totalFound: number;
  activeClaims: number;
  resolvedItems: number;
}

export interface MonthlyMetric {
  month: string;
  lost: number;
  found: number;
  resolved: number;
}
