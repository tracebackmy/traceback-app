'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/services/mockFirebase';
import { DashboardStats, ClaimRequest, Item, ClaimStatus, ItemStatus } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatsWidget } from '@/components/features/StatsWidget';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentClaims, setRecentClaims] = useState<ClaimRequest[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    // Real-time subscription for dashboard metrics
    const unsubStats = db.subscribeToStats((newStats) => {
        setStats(newStats);
    });

    // Initial data load for lists
    loadData();

    return () => {
        unsubStats();
    };
  }, []);

  const loadData = async () => {
    // Force refresh stats in case subscription is delayed
    setStats(db.getDashboardStats());
    
    const allClaims = await db.getAllClaims();
    setRecentClaims(allClaims.sort((a,b) => b.createdAt - a.createdAt).slice(0, 5)); 
    
    const allItems = await db.getItems();
    setItems(allItems);
  };

  const approveClaim = async (id: string) => {
    if(confirm("Approve this claim?")) {
        await db.approveClaim(id, 'admin_123');
        loadData();
    }
  };

  const markMatchFound = async (item: Item) => {
    if (confirm(`Mark "${item.title}" as Match Found? This will trigger an email to the user.`)) {
        await db.updateItemStatus(item.id, ItemStatus.MatchFound);
        loadData();
    }
  };

  if (!stats) return <div className="p-8 text-center text-muted">Loading Admin Console...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Console</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <StatsWidget 
            title="Total Found Items" 
            value={stats.totalFound} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
        <StatsWidget 
            title="Reported Lost" 
            value={stats.totalLost} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <StatsWidget 
            title="Active Claims" 
            value={stats.activeClaims} 
            color="brand"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatsWidget 
            title="Successful Returns" 
            value={stats.resolvedItems} 
            color="green"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RECENT CLAIMS CARD */}
        <div className="bg-white shadow-soft rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg leading-6 font-bold text-gray-900">Recent Claims</h3>
                <Link href="/admin/claims" className="text-sm font-bold text-brand hover:text-brand-600">View All</Link>
            </div>
            <ul className="divide-y divide-gray-100">
                {recentClaims.map(claim => (
                    <li key={claim.id} className="px-5 py-4 hover:bg-gray-50 transition">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold text-gray-900">Item ID: {claim.itemId}</p>
                                <p className="text-xs text-muted">User: {claim.userId}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${claim.status === ClaimStatus.Approved ? 'bg-green-100 text-green-800' : 
                                      claim.status === ClaimStatus.Rejected ? 'bg-red-100 text-red-800' : 
                                      'bg-yellow-100 text-yellow-800'}`}>
                                    {claim.status}
                                </span>
                                
                                <button 
                                    onClick={() => router.push(`/tickets/${claim.verificationTicketId}`)}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200"
                                >
                                    Chat
                                </button>
                                
                                {claim.status !== ClaimStatus.Approved && claim.status !== ClaimStatus.Rejected && (
                                    <button 
                                        onClick={() => approveClaim(claim.id)}
                                        className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-lg hover:bg-green-100"
                                    >
                                        Approve
                                    </button>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
                {recentClaims.length === 0 && <li className="p-8 text-center text-muted text-sm">No pending claims.</li>}
            </ul>
        </div>

        {/* SYSTEM ITEMS CARD */}
        <div className="bg-white shadow-soft rounded-2xl border border-border overflow-hidden">
             <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg leading-6 font-bold text-gray-900">System Items</h3>
                <Link href="/admin/items" className="text-sm font-bold text-brand hover:text-brand-600">Manage All</Link>
            </div>
             <div className="overflow-y-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {items.slice(0, 8).map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-[120px]">{item.title}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 uppercase">{item.itemType}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        item.status === ItemStatus.Listed || item.status === ItemStatus.MatchFound ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                    {item.itemType === 'lost' && item.status === ItemStatus.Reported && (
                                        <button 
                                            onClick={() => markMatchFound(item)}
                                            className="text-xs text-blue-600 hover:text-blue-900 font-bold bg-blue-50 px-2 py-1 rounded"
                                        >
                                            Mark Match
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
      </div>
    </div>
  );
}