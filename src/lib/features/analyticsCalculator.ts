
import { Item, ClaimRequest, DashboardStats } from '@/types';

export const calculateDashboardStats = (items: Item[], claims: ClaimRequest[]): DashboardStats => {
  const totalLost = items.filter(i => i.itemType === 'lost').length;
  const totalFound = items.filter(i => i.itemType === 'found').length;
  
  // Active claims are those not yet finalized
  const activeClaims = claims.filter(c => 
    c.status !== 'approved' && c.status !== 'rejected'
  ).length;

  // Resolved items
  const resolvedItems = items.filter(i => i.status === 'resolved').length;

  return {
    totalLost,
    totalFound,
    activeClaims,
    resolvedItems
  };
};

export const getItemsByStation = (items: Item[]) => {
  const counts: Record<string, number> = {};
  items.forEach(item => {
    const station = item.stationId || 'Unknown';
    counts[station] = (counts[station] || 0) + 1;
  });
  return counts;
};
