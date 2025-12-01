// FILE: src/app/(admin)/claims/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { approveClaimAction, rejectClaimAction } from '@/lib/actions/adminActions.action';
import { ClaimRequest, Item } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processed'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const allClaims = await FirestoreService.getAllClaims();
        // Fetch items efficiently? For now fetching recent/all needed for display
        // Optimization: In real app, fetch only items related to claims
        // Here we fetch a batch or rely on what we have. 
        // Let's fetch all items for simplicity in V1 admin view
        const { items: allItems } = await FirestoreService.getItems({ limit: 100 });
        
        setClaims(allClaims.sort((a, b) => b.createdAt - a.createdAt));
        setItems(allItems);
    } catch(e) {
        console.error("Failed to load claims data", e);
    } finally {
        setLoading(false);
    }
  };

  const getItemForClaim = (itemId: string) => items.find(i => i.id === itemId);

  const handleApprove = async (claimId: string) => {
    if (confirm("Are you sure you want to approve this claim? This will resolve the item.")) {
        const claim = claims.find(c => c.id === claimId);
        if(!claim) return;

        const result = await approveClaimAction(claimId, 'admin', claim.itemId);
        if(result.success) {
            alert("Claim Approved.");
            loadData();
        } else {
            alert("Failed to approve claim.");
        }
    }
  };

  const handleReject = async (claimId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
        const result = await rejectClaimAction(claimId, 'admin', reason);
        if(result.success) {
            alert("Claim Rejected.");
            loadData();
        } else {
            alert("Failed to reject claim.");
        }
    }
  };

  const filteredClaims = claims.filter(c => {
      if (filter === 'all') return true;
      if (filter === 'pending') return c.status !== 'approved' && c.status !== 'rejected';
      if (filter === 'processed') return c.status === 'approved' || c.status === 'rejected';
      return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-ink">Claims Management</h1>
            <p className="text-muted mt-1">Verify ownership and process claim requests.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
             <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${filter === 'all' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>All</button>
             <button onClick={() => setFilter('pending')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${filter === 'pending' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>Pending Action</button>
             <button onClick={() => setFilter('processed')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${filter === 'processed' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>Processed</button>
        </div>
      </div>

      <div className="bg-white shadow-soft rounded-2xl border border-border overflow-hidden">
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User Info</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                         <tr><td colSpan={5} className="text-center py-10">Loading claims...</td></tr>
                    ) : filteredClaims.length === 0 ? (
                         <tr><td colSpan={5} className="text-center py-10 text-muted">No claims found.</td></tr>
                    ) : (
                        filteredClaims.map(claim => {
                            const item = getItemForClaim(claim.itemId);
                            return (
                                <tr key={claim.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            {item?.imageUrls?.[0] ? (
                                                <img className="h-10 w-10 rounded object-cover mr-3 border" src={item.imageUrls[0]} alt="" />
                                            ) : (
                                                <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center mr-3 text-xs">N/A</div>
                                            )}
                                            <div>
                                                <div className="text-sm font-bold text-ink">{item?.title || 'Unknown Item'}</div>
                                                <div className="text-xs text-muted">ID: {claim.itemId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-ink">{claim.userId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full uppercase tracking-wide
                                            ${claim.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                              claim.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                              'bg-yellow-100 text-yellow-800'}`}>
                                            {claim.status.replace('-', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                                        {new Date(claim.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {claim.verificationTicketId && (
                                            <button 
                                                onClick={() => router.push(`/tickets/${claim.verificationTicketId}`)}
                                                className="text-brand hover:text-brand-600 font-bold"
                                            >
                                                Open Chat
                                            </button>
                                        )}
                                        
                                        {claim.status !== 'approved' && claim.status !== 'rejected' && (
                                            <>
                                                <button 
                                                    onClick={() => handleApprove(claim.id)}
                                                    className="text-green-600 hover:text-green-900 font-bold"
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    onClick={() => handleReject(claim.id)}
                                                    className="text-red-600 hover:text-red-900 font-bold"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}