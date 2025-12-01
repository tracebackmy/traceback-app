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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Parallel fetching for speed
        const [
            usersSnap, 
            itemsSnap, 
            lostItemsSnap, 
            foundItemsSnap, 
            ticketsSnap, 
            claimsSnap
        ] = await Promise.all([
            getCountFromServer(collection(db, 'users')),
            getCountFromServer(collection(db, 'items')),
            getCountFromServer(query(collection(db, 'items'), where('type', '==', 'lost'))),
            getCountFromServer(query(collection(db, 'items'), where('type', '==', 'found'))),
            getCountFromServer(query(collection(db, 'tickets'), where('status', '==', 'open'))),
            getCountFromServer(query(collection(db, 'claims'), where('status', '==', 'pending')))
        ]);

        setStats({
          totalUsers: usersSnap.data().count,
          totalItems: itemsSnap.data().count,
          lostItems: lostItemsSnap.data().count,
          foundItems: foundItemsSnap.data().count,
          openTickets: ticketsSnap.data().count,
          pendingClaims: claimsSnap.data().count,
          recentActivity: 0, // Placeholder if activity collection isn't used yet
        });

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
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of system activity.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Users" value={stats.totalUsers} icon="👥" color="bg-blue-500" link="/traceback-admin/users" />
        <StatsCard title="Found Inventory" value={stats.foundItems} icon="📦" color="bg-green-500" link="/traceback-admin/items" />
        <StatsCard title="Lost Reports" value={stats.lostItems} icon="🔍" color="bg-orange-500" link="/traceback-admin/items" />
        <StatsCard title="Pending Claims" value={stats.pendingClaims} icon="❗" color="bg-red-500" link="/traceback-admin/claims" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3">
               <Link href="/traceback-admin/items/new" className="block text-center bg-green-600 text-white py-2 rounded hover:bg-green-700">
                 + Register Found Item
               </Link>
               <Link href="/traceback-admin/claims" className="block text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                 Review Pending Claims ({stats.pendingClaims})
               </Link>
            </div>
         </div>
         <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Support</h2>
            <p className="text-3xl font-bold text-yellow-600">{stats.openTickets}</p>
            <p className="text-gray-500 text-sm mb-4">Open Tickets</p>
            <Link href="/traceback-admin/tickets" className="text-blue-600 hover:underline text-sm">
               Go to Ticket Queue →
            </Link>
         </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, color, link }: any) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${color}`}>
             <span className="text-white text-xl">{icon}</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm">
          <Link href={link} className="font-medium text-blue-600 hover:text-blue-500">View details</Link>
        </div>
      </div>
    </div>
  )
}