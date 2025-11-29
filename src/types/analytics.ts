export interface AnalyticsData {
  totalUsers: number;
  totalItems: number;
  lostItems: number;
  foundItems: number;
  openTickets: number;
  resolvedTickets: number;
  pendingClaims: number;
  approvedClaims: number;
  itemsByCategory: Record<string, number>;
  itemsByStation: Record<string, number>;
  dailyActivity: Array<{
    date: string;
    items: number;
    claims: number;
    tickets: number;
  }>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}