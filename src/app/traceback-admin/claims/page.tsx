'use client';

import { useState, useEffect, useCallback } from 'react'; 
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import Link from 'next/link';
import { ClaimRequest, ItemClaimStatus } from '@/types/claim';
import ExportButton from '@/components/ExportButton';

export default function AdminClaimsPage() {
  const { admin } = useAdmin();
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ItemClaimStatus | 'all'>('all');

  // FIX: Removed unused 'Item' logic from list view for performance, 
  // detailed item info is fetched in the detail page.

  const fetchClaims = useCallback(() => {
    let claimsQuery;
    
    if (filter === 'all') {
      claimsQuery = query(collection(db, 'claims'), orderBy('createdAt', 'desc'));
    } else {
      claimsQuery = query(
        collection(db, 'claims'), 
        where('status', '==', filter),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(claimsQuery, (snapshot) => {
      const claimsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClaimRequest[];
      setClaims(claimsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]); 

  useEffect(() => {
    const unsub = fetchClaims();
    return unsub;
  }, [fetchClaims]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between mb-6">
            <h1 className="text-2xl font-bold">Claims Management</h1>
            <div className="space-x-2">
                <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>All</button>
                <button onClick={() => setFilter('claim-submitted')} className={`px-3 py-1 rounded ${filter === 'claim-submitted' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>New</button>
                <button onClick={() => setFilter('verification-chat')} className={`px-3 py-1 rounded ${filter === 'verification-chat' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>In Chat</button>
            </div>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {claims.map(claim => (
                        <tr key={claim.id}>
                            <td className="px-6 py-4 whitespace-nowrap">{claim.userEmail}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.itemId}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${claim.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                      claim.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                      'bg-yellow-100 text-yellow-800'}`}>
                                    {claim.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Link href={`/traceback-admin/claims/${claim.id}`} className="text-indigo-600 hover:text-indigo-900">Review</Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}