'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Ticket } from '@/types/chat';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'closed'>('all');

  useEffect(() => {
    // 1. Build the query
    let ticketsQuery;
    
    if (filter === 'all') {
      ticketsQuery = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
    } else {
      ticketsQuery = query(
        collection(db, 'tickets'), 
        where('status', '==', filter),
        orderBy('updatedAt', 'desc')
      );
    }

    // 2. Real-time listener
    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      setTickets(ticketsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  // Helper: Format Date Safely
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Helper: Status Color with Fallback
  const getStatusColor = (status: string) => {
    const safeStatus = (status || 'open').toLowerCase(); // Safety check
    switch (safeStatus) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper: Priority Color with Fallback
  const getPriorityColor = (priority: string) => {
    const safePriority = (priority || 'medium').toLowerCase(); // Safety check
    switch (safePriority) {
      case 'high': return 'text-red-600 font-bold';
      case 'medium': return 'text-orange-500 font-medium';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  // Helper: Format Text (Capitalize) Safely
  const capitalize = (text: string) => {
    if (!text) return 'Unknown';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-2">Manage incoming user inquiries and lost item reports.</p>
        </div>
        
        {/* Filter Controls */}
        <div className="bg-white border border-gray-200 p-1 rounded-lg flex space-x-1">
          {['all', 'open', 'in-progress', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                filter === status 
                  ? 'bg-[#FF385C] text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {status.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-xl mb-2">No tickets found</p>
            <p className="text-sm">Good job! Your support queue is empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tickets.map((ticket) => {
                  // SAFETY: Define safe variables before using them in render
                  const safePriority = ticket.priority || 'medium';
                  const safeStatus = ticket.status || 'open';
                  const safeSubject = ticket.subject || 'No Subject';
                  
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/traceback-admin/tickets/${ticket.id}`} className="block group">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-[#FF385C]">
                            {safeSubject}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {ticket.id.substring(0, 8)}...
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{ticket.userName || 'Unknown User'}</div>
                        <div className="text-xs text-gray-500">{ticket.userEmail || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusColor(safeStatus)}`}>
                          {safeStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {/* FIX: We use safePriority here instead of ticket.priority */}
                        <span className={getPriorityColor(safePriority)}>
                          {capitalize(safePriority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(ticket.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/traceback-admin/tickets/${ticket.id}`}
                          className="text-[#FF385C] hover:text-[#E31C5F] text-sm font-medium"
                        >
                          Reply →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}