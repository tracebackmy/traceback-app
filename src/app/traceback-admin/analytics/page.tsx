'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import StatsChart from '@/components/charts/StatsChart';
import ActivityChart from '@/components/charts/ActivityChart';
import ExportButton from '@/components/ExportButton';

interface AnalyticsData {
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

interface ExportData {
  items: unknown[];
  claims: unknown[];
  users: unknown[];
  tickets: unknown[];
}

export default function AnalyticsPage() {
  const { admin } = useAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalItems: 0,
    lostItems: 0,
    foundItems: 0,
    openTickets: 0,
    resolvedTickets: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    itemsByCategory: {},
    itemsByStation: {},
    dailyActivity: []
  });
  const [exportData, setExportData] = useState<ExportData>({
    items: [],
    claims: [],
    users: [],
    tickets: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(now.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));

      // Fetch all data in parallel
      const [
        usersSnapshot,
        itemsSnapshot,
        lostItemsSnapshot,
        foundItemsSnapshot,
        openTicketsSnapshot,
        resolvedTicketsSnapshot,
        pendingClaimsSnapshot,
        approvedClaimsSnapshot,
        claimsSnapshot,
        ticketsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'items')),
        getDocs(query(collection(db, 'items'), where('type', '==', 'lost'))),
        getDocs(query(collection(db, 'items'), where('type', '==', 'found'))),
        getDocs(query(collection(db, 'tickets'), where('status', '==', 'open'))),
        getDocs(query(collection(db, 'tickets'), where('status', '==', 'resolved'))),
        getDocs(query(collection(db, 'claims'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'claims'), where('status', '==', 'approved'))),
        getDocs(collection(db, 'claims')),
        getDocs(collection(db, 'tickets'))
      ]);

      // Process items for category and station breakdown
      const itemsByCategory: Record<string, number> = {};
      const itemsByStation: Record<string, number> = {};
      
      itemsSnapshot.docs.forEach(doc => {
        const item = doc.data();
        
        // Category breakdown
        const category = item.category || 'Unknown';
        itemsByCategory[category] = (itemsByCategory[category] || 0) + 1;
        
        // Station breakdown
        const station = item.stationId || 'Unknown';
        itemsByStation[station] = (itemsByStation[station] || 0) + 1;
      });

      // Generate daily activity data
      const dailyActivity = generateDailyActivity(startDate, now, itemsSnapshot, claimsSnapshot, ticketsSnapshot);

      // Prepare export data
      setExportData({
        items: itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        claims: claimsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        users: usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        tickets: ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      });

      setAnalytics({
        totalUsers: usersSnapshot.size,
        totalItems: itemsSnapshot.size,
        lostItems: lostItemsSnapshot.size,
        foundItems: foundItemsSnapshot.size,
        openTickets: openTicketsSnapshot.size,
        resolvedTickets: resolvedTicketsSnapshot.size,
        pendingClaims: pendingClaimsSnapshot.size,
        approvedClaims: approvedClaimsSnapshot.size,
        itemsByCategory,
        itemsByStation,
        dailyActivity
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyActivity = (
    startDate: Date, 
    endDate: Date, 
    itemsSnapshot: any, 
    claimsSnapshot: any, 
    ticketsSnapshot: any
  ) => {
    const dailyData: Record<string, { items: number; claims: number; tickets: number }> = {};
    
    // Initialize all dates in range with zeros
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = { items: 0, claims: 0, tickets: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count items per day
    itemsSnapshot.docs.forEach((doc: any) => {
      const item = doc.data();
      const itemDate = getDateFromTimestamp(item.createdAt);
      if (itemDate >= startDate && itemDate <= endDate) {
        const dateKey = itemDate.toISOString().split('T')[0];
        dailyData[dateKey].items++;
      }
    });

    // Count claims per day
    claimsSnapshot.docs.forEach((doc: any) => {
      const claim = doc.data();
      const claimDate = getDateFromTimestamp(claim.createdAt);
      if (claimDate >= startDate && claimDate <= endDate) {
        const dateKey = claimDate.toISOString().split('T')[0];
        dailyData[dateKey].claims++;
      }
    });

    // Count tickets per day
    ticketsSnapshot.docs.forEach((doc: any) => {
      const ticket = doc.data();
      const ticketDate = getDateFromTimestamp(ticket.createdAt);
      if (ticketDate >= startDate && ticketDate <= endDate) {
        const dateKey = ticketDate.toISOString().split('T')[0];
        dailyData[dateKey].tickets++;
      }
    });

    // Convert to array and take last 14 days for display
    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .slice(-14);
  };

  const getDateFromTimestamp = (timestamp: unknown): Date => {
    if (!timestamp) return new Date();
    try {
      if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        return (timestamp as { toDate: () => Date }).toDate();
      }
      return new Date(timestamp as string);
    } catch {
      return new Date();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Track system performance and user activity</p>
          </div>
          
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Data Export</h2>
              <p className="text-gray-600 text-sm">Export system data for analysis</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
              <ExportButton
                data={exportData.items}
                headers={['id', 'title', 'category', 'type', 'stationId', 'status', 'createdAt']}
                filename={`items-export-${new Date().toISOString().split('T')[0]}.csv`}
                label="Export Items"
              />
              <ExportButton
                data={exportData.claims}
                headers={['id', 'itemId', 'userName', 'userEmail', 'status', 'createdAt']}
                filename={`claims-export-${new Date().toISOString().split('T')[0]}.csv`}
                label="Export Claims"
              />
              <ExportButton
                data={exportData.users}
                headers={['uid', 'email', 'fullName', 'phone', 'createdAt']}
                filename={`users-export-${new Date().toISOString().split('T')[0]}.csv`}
                label="Export Users"
              />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-semibold text-gray-900">{analytics.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-2xl font-semibold text-gray-900">{analytics.totalItems}</p>
            <p className="text-sm text-gray-500 mt-1">
              {analytics.lostItems} lost • {analytics.foundItems} found
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Active Tickets</p>
            <p className="text-2xl font-semibold text-gray-900">{analytics.openTickets}</p>
            <p className="text-sm text-gray-500 mt-1">
              {analytics.resolvedTickets} resolved
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-500">Pending Claims</p>
            <p className="text-2xl font-semibold text-gray-900">{analytics.pendingClaims}</p>
            <p className="text-sm text-gray-500 mt-1">
              {analytics.approvedClaims} approved
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Chart */}
          <ActivityChart
            data={analytics.dailyActivity}
            title="Daily Activity"
          />

          {/* Items by Category */}
          <StatsChart
            data={{
              labels: Object.keys(analytics.itemsByCategory),
              values: Object.values(analytics.itemsByCategory)
            }}
            title="Items by Category"
            color="#FF385C"
          />

          {/* Items by Station */}
          <StatsChart
            data={{
              labels: Object.keys(analytics.itemsByStation).slice(0, 8), // Top 8 stations
              values: Object.values(analytics.itemsByStation).slice(0, 8)
            }}
            title="Top Stations"
            color="#10B981"
          />

          {/* Status Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Items Reported</span>
                <span className="font-semibold text-gray-900">{analytics.totalItems}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Successful Claims</span>
                <span className="font-semibold text-green-600">{analytics.approvedClaims}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Users</span>
                <span className="font-semibold text-blue-600">{analytics.totalUsers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Support Tickets</span>
                <span className="font-semibold text-yellow-600">{analytics.openTickets}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Item Types</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Lost Items</span>
                <span className="font-medium text-gray-900">{analytics.lostItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Found Items</span>
                <span className="font-medium text-gray-900">{analytics.foundItems}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Claim Rate</span>
                  <span className="font-medium text-green-600">
                    {analytics.totalItems > 0 
                      ? `${((analytics.approvedClaims / analytics.totalItems) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3">User Activity</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">New Users ({timeRange})</span>
                <span className="font-medium text-gray-900">
                  {analytics.dailyActivity.reduce((sum, day) => sum + day.items, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Daily Items</span>
                <span className="font-medium text-gray-900">
                  {(analytics.dailyActivity.reduce((sum, day) => sum + day.items, 0) / analytics.dailyActivity.length).toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Ticket Resolution</span>
                <span className="font-medium text-green-600">
                  {analytics.openTickets + analytics.resolvedTickets > 0
                    ? `${((analytics.resolvedTickets / (analytics.openTickets + analytics.resolvedTickets)) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Claim Processing</span>
                <span className="font-medium text-blue-600">
                  {analytics.pendingClaims + analytics.approvedClaims > 0
                    ? `${((analytics.approvedClaims / (analytics.pendingClaims + analytics.approvedClaims)) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}