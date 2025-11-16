'use client';

import { useState, useEffect } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminStats } from '@/types/admin';
import Link from 'next/link';

export default function AdminDashboard() {
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

  useEffect(() => {
    const fetchStats = async () => {
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

        // For now, pending claims is 0 (will be implemented in Phase 3)
        const pendingClaims = 0;
        
        // For now, recent activity is based on open tickets (will be enhanced later)
        const recentActivity = ticketsSnapshot.data().count;

        setStats({
          totalUsers: usersSnapshot.data().count,
          totalItems: itemsSnapshot.data().count,
          openTickets: ticketsSnapshot.data().count,
          pendingClaims,
          lostItems: lostItemsSnapshot.data().count,
          foundItems: foundItemsSnapshot.data().count,
          recentActivity,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">U</span>
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
                  <span className="text-white text-sm font-bold">I</span>
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
                  <span className="text-white text-sm font-bold">T</span>
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
                  <span className="text-white text-sm font-bold">C</span>
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

        {/* Additional Stats Cards */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">L</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Lost Items</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.lostItems}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="font-medium text-gray-500">Active reports</span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">F</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Found Items</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.foundItems}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="font-medium text-gray-500">Waiting for claim</span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Recent Activity</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.recentActivity}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="font-medium text-gray-500">Last 24h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/traceback-admin/items"
            className="bg-[#FF385C] text-white px-4 py-3 rounded-lg text-center hover:bg-[#E31C5F] transition-colors"
          >
            Manage Items
          </Link>
          <Link
            href="/traceback-admin/tickets"
            className="bg-[#FF385C] text-white px-4 py-3 rounded-lg text-center hover:bg-[#E31C5F] transition-colors"
          >
            View Tickets
          </Link>
          <Link
            href="/traceback-admin/users"
            className="bg-[#FF385C] text-white px-4 py-3 rounded-lg text-center hover:bg-[#E31C5F] transition-colors"
          >
            User Management
          </Link>
        </div>
      </div>
    </div>
  );
}