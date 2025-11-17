'use client';

import { useState, useEffect } from 'react';
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminStats } from '@/types/admin';
import Link from 'next/link';
import { useAdmin } from '@/components/AdminProvider';

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  userEmail: string;
}

export default function AdminDashboard() {
  const { admin } = useAdmin();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalItems: 0,
    openTickets: 0,
    pendingClaims: 0,
    lostItems: 0,
    foundItems: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get total users
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));
        
        // Get total items
        const itemsSnapshot = await getCountFromServer(collection(db, 'items'));
        
        // Get open tickets
        const ticketsQuery = query(collection(db, 'tickets'), where('status', '==', 'open'));
        const ticketsSnapshot = await getCountFromServer(ticketsQuery);
        
        // Get lost items count
        const lostItemsQuery = query(collection(db, 'items'), where('type', '==', 'lost'));
        const lostItemsSnapshot = await getCountFromServer(lostItemsQuery);
        
        // Get found items count
        const foundItemsQuery = query(collection(db, 'items'), where('type', '==', 'found'));
        const foundItemsSnapshot = await getCountFromServer(foundItemsQuery);

        // Get pending claims (items with claim requests)
        const claimsQuery = query(collection(db, 'items'), where('claimStatus', '==', 'pending'));
        const claimsSnapshot = await getCountFromServer(claimsQuery);

        // Get recent activities
        const activitiesQuery = query(
          collection(db, 'activities'), 
          orderBy('timestamp', 'desc'), 
          limit(5)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activities = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as RecentActivity[];

        setStats({
          totalUsers: usersSnapshot.data().count,
          totalItems: itemsSnapshot.data().count,
          openTickets: ticketsSnapshot.data().count,
          pendingClaims: claimsSnapshot.data().count,
          lostItems: lostItemsSnapshot.data().count,
          foundItems: foundItemsSnapshot.data().count,
          recentActivity: activities.length,
        });

        setRecentActivities(activities);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {admin?.email?.split('@')[0] || 'Admin'}!
        </h1>
        <p className="text-gray-600">
          Here&apos;s what&apos;s happening with your Traceback administration today.
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">👥</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/traceback-admin/users" className="font-medium text-[#FF385C] hover:text-[#E31C5F]">
                View all users
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📦</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalItems}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/traceback-admin/items" className="font-medium text-[#FF385C] hover:text-[#E31C5F]">
                Manage items
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🎫</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Open Tickets</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.openTickets}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/traceback-admin/tickets" className="font-medium text-[#FF385C] hover:text-[#E31C5F]">
                View tickets
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Claims</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingClaims}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/traceback-admin/claims" className="font-medium text-[#FF385C] hover:text-[#E31C5F]">
                Review claims
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            <Link
              href="/traceback-admin/items/new"
              className="bg-[#FF385C] text-white px-4 py-3 rounded-lg text-center hover:bg-[#E31C5F] transition-colors font-medium"
            >
              ➕ Add New Item
            </Link>
            <Link
              href="/traceback-admin/tickets"
              className="bg-[#FF385C] text-white px-4 py-3 rounded-lg text-center hover:bg-[#E31C5F] transition-colors font-medium"
            >
              💬 Manage Tickets
            </Link>
            <Link
              href="/traceback-admin/claims"
              className="bg-[#FF385C] text-white px-4 py-3 rounded-lg text-center hover:bg-[#E31C5F] transition-colors font-medium"
            >
              ✅ Process Claims
            </Link>
            <Link
              href="/traceback-admin/cctv"
              className="bg-[#FF385C] text-white px-4 py-3 rounded-lg text-center hover:bg-[#E31C5F] transition-colors font-medium"
            >
              📹 CCTV Management
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-[#FF385C] rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.userEmail} • {activity.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Activities will appear here as users interact with the system</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="text-green-600 text-2xl mb-2">✓</div>
            <h3 className="font-semibold text-green-800">Authentication</h3>
            <p className="text-green-600 text-sm">Operational</p>
          </div>
          <div className="text-center p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="text-green-600 text-2xl mb-2">✓</div>
            <h3 className="font-semibold text-green-800">Database</h3>
            <p className="text-green-600 text-sm">Connected</p>
          </div>
          <div className="text-center p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="text-green-600 text-2xl mb-2">✓</div>
            <h3 className="font-semibold text-green-800">Chat System</h3>
            <p className="text-green-600 text-sm">Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}