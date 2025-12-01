// FILE: src/app/(admin)/tickets/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Ticket } from '@/types';
import Link from 'next/link';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const all = await FirestoreService.getAllTickets();
        setTickets(all.sort((a, b) => b.updatedAt - a.updatedAt));
      } catch (error) {
        console.error("Failed to load tickets", error);
      } finally {
        setLoading(false);
      }
    };
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'open') return t.status !== 'resolved';
      if (filter === 'resolved') return t.status === 'resolved';
      return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
          <div>
              <h1 className="text-3xl font-bold text-ink">Support Inbox</h1>
              <p className="text-muted mt-1">Manage user inquiries, claims, and lost item reports.</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setFilter('all')} 
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${filter === 'all' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('open')} 
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${filter === 'open' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
              >
                Open
              </button>
              <button 
                onClick={() => setFilter('resolved')} 
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${filter === 'resolved' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
              >
                Resolved
              </button>
          </div>
      </div>

      {loading ? (
          <div className="text-center py-12">Loading tickets...</div>
      ) : (
          <div className="bg-white shadow-soft rounded-2xl border border-border overflow-hidden">
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Last Update</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTickets.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{ticket.userId}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 font-bold">{ticket.title}</div>
                                    <div className="text-xs text-muted truncate max-w-xs">{ticket.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${ticket.type === 'claim_verification' ? 'bg-purple-100 text-purple-800' : 
                                          ticket.type === 'item_match' ? 'bg-blue-100 text-blue-800' : 
                                          'bg-gray-100 text-gray-800'}`}>
                                        {ticket.type.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${ticket.status === 'open' ? 'bg-green-100 text-green-800' : 
                                          ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-gray-100 text-gray-600'}`}>
                                        {ticket.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                                    {new Date(ticket.updatedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link href={`/tickets/${ticket.id}`} className="text-brand hover:text-brand-600 font-bold">
                                        Open Chat
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {filteredTickets.length === 0 && (
                 <div className="p-8 text-center text-muted">No tickets found.</div>
             )}
          </div>
      )}
    </div>
  );
}