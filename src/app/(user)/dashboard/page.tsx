
'use client';

import React, { useState } from 'react';
import { db } from '@/services/mockFirebase';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { myItems, myClaims, myTickets, loadingData } = useData();
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);

  // Filter lost items from myItems
  const lostItems = myItems.filter(i => i.itemType === 'lost');

  const handleVerify = async () => {
    if(!user) return;
    setVerifying(true);
    try {
        await db.verifyCurrentUser();
        refreshUser();
        alert("Account verified successfully!");
    } catch(e) {
        console.error("Verification failed", e);
        alert("Verification failed. Please try again.");
    } finally {
        setVerifying(false);
    }
  };

  if (!user) return <div className="p-8 text-center">Loading dashboard...</div>;
  if (loadingData) return <div className="p-8 text-center">Syncing data...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-ink mb-8">My Dashboard</h1>

      <div className={`mb-8 rounded-2xl p-6 border ${user.isVerified ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-200'}`}>
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user.isVerified ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {user.isVerified ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    )}
                 </div>
                 <div>
                     <h3 className={`text-lg font-bold ${user.isVerified ? 'text-green-800' : 'text-yellow-800'}`}>
                         {user.isVerified ? 'Account Verified' : 'Action Required: Verify Account'}
                     </h3>
                     <p className={`text-sm ${user.isVerified ? 'text-green-600' : 'text-yellow-700'}`}>
                         {user.isVerified 
                            ? 'You have full access to report lost items and submit claims.' 
                            : 'You must verify your email address before you can report lost items or claim found items.'}
                     </p>
                 </div>
             </div>
             
             {!user.isVerified && (
                 <button 
                    onClick={handleVerify}
                    disabled={verifying}
                    className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-full shadow-sm transition disabled:opacity-50"
                 >
                    {verifying ? 'Verifying...' : 'Verify Email Now'}
                 </button>
             )}
         </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow-soft rounded-2xl border border-border">
          <div className="px-5 py-6">
            <dt className="text-sm font-medium text-muted truncate">Active Lost Reports</dt>
            <dd className="mt-1 text-3xl font-extrabold text-ink">{lostItems.length}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow-soft rounded-2xl border border-border">
          <div className="px-5 py-6">
            <dt className="text-sm font-medium text-muted truncate">Pending Claims</dt>
            <dd className="mt-1 text-3xl font-extrabold text-ink">{myClaims.length}</dd>
          </div>
        </div>
         <div className="bg-white overflow-hidden shadow-soft rounded-2xl border border-border">
          <div className="px-5 py-6">
            <dt className="text-sm font-medium text-muted truncate">Support Tickets</dt>
            <dd className="mt-1 text-3xl font-extrabold text-ink">{myTickets.length}</dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white shadow-soft rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-gray-50/50">
            <h3 className="text-lg leading-6 font-bold text-ink">My Claims</h3>
          </div>
          <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {myClaims.length === 0 ? (
                <li className="px-5 py-8 text-sm text-muted text-center">No active claims</li>
            ) : (
                myClaims.map(claim => (
                    <li key={claim.id} className="px-5 py-4 hover:bg-gray-50 transition">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold text-ink">Item ID: {claim.itemId}</p>
                                <p className="text-xs text-muted">Submitted: {new Date(claim.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-wide
                                ${claim.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                  claim.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                  'bg-yellow-100 text-yellow-800'}`}>
                                {claim.status.replace('-', ' ')}
                            </span>
                        </div>
                    </li>
                ))
            )}
          </ul>
        </div>

        <div className="bg-white shadow-soft rounded-2xl border border-border overflow-hidden">
           <div className="px-5 py-4 border-b border-border bg-gray-50/50">
            <h3 className="text-lg leading-6 font-bold text-ink">Support Tickets</h3>
          </div>
          <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {myTickets.length === 0 ? (
                <li className="px-5 py-8 text-sm text-muted text-center">No support tickets</li>
            ) : (
                myTickets.map(ticket => (
                    <li key={ticket.id} className="px-5 py-4 hover:bg-gray-50 transition">
                        <Link href={`/tickets/${ticket.id}`} className="block">
                             <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-ink">{ticket.title}</p>
                                    <p className="text-xs text-muted">{ticket.type} • {new Date(ticket.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-800">
                                    {ticket.status}
                                </span>
                            </div>
                        </Link>
                    </li>
                ))
            )}
          </ul>
        </div>

      </div>
    </div>
  );
}
