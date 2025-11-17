// src/app/traceback-admin/tickets/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import Link from 'next/link';
import { Ticket } from '@/types/chat';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface Item {
  id: string;
  name: string;
  category: string;
  type: 'lost' | 'found';
}

// Extended Ticket interface with description
interface ExtendedTicket extends Ticket {
  description?: string;
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { admin } = useAdmin();
  const [ticket, setTicket] = useState<ExtendedTicket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketId) {
      fetchTicketData();
    }
  }, [ticketId]);

  const fetchTicketData = async () => {
    try {
      // Fetch ticket
      const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
      if (ticketDoc.exists()) {
        const ticketData = {
          id: ticketDoc.id,
          ...ticketDoc.data(),
        } as ExtendedTicket;
        setTicket(ticketData);

        // Fetch user
        const userDoc = await getDoc(doc(db, 'users', ticketData.userId));
        if (userDoc.exists()) {
          setUser({
            id: userDoc.id,
            ...userDoc.data()
          } as User);
        }

        // Try to find related item by user ID
        const itemsQuery = query(
          collection(db, 'items'),
          where('userId', '==', ticketData.userId),
          where('status', '==', 'open')
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        if (!itemsSnapshot.empty) {
          const itemData = {
            id: itemsSnapshot.docs[0].id,
            ...itemsSnapshot.docs[0].data()
          } as Item;
          setItem(itemData);
        }
      } else {
        console.error('Ticket not found');
      }
    } catch (error) {
      console.error('Error fetching ticket data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (newStatus: Ticket['status']) => {
    if (!ticket) return;

    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
        assignedAdmin: admin?.uid
      });
      setTicket(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const updateTicketPriority = async (newPriority: Ticket['priority']) => {
    if (!ticket) return;

    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        priority: newPriority,
        updatedAt: Timestamp.now()
      });
      setTicket(prev => prev ? { ...prev, priority: newPriority } : null);
    } catch (error) {
      console.error('Error updating ticket priority:', error);
    }
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      let date: Date;
      
      if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        date = (timestamp as { toDate: () => Date }).toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp as string);
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Ticket Not Found</h1>
            <p className="text-gray-600 mb-4">The requested ticket could not be found.</p>
            <Link 
              href="/traceback-admin/tickets"
              className="bg-[#FF385C] text-white px-6 py-2 rounded-lg hover:bg-[#E31C5F] transition-colors"
            >
              Back to Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link 
            href="/traceback-admin/tickets"
            className="inline-flex items-center text-[#FF385C] hover:text-[#E31C5F] mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Tickets
          </Link>
        </div>

        {/* Main Ticket Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
              <p className="text-gray-600 mt-2">{ticket.description || 'No description provided'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-gray-600">{formatDate(ticket.createdAt)}</p>
            </div>
          </div>

          {/* Ticket Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
              <select
                value={ticket.status}
                onChange={(e) => updateTicketStatus(e.target.value as Ticket['status'])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF385C] bg-white"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Priority</h3>
              <select
                value={ticket.priority}
                onChange={(e) => updateTicketPriority(e.target.value as Ticket['priority'])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF385C] bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Last Updated</h3>
              <p className="text-gray-600">{formatDate(ticket.updatedAt)}</p>
            </div>
          </div>

          {/* User and Item Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-3">User Information</h3>
              {user ? (
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {user.displayName || 'Not provided'}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p><span className="font-medium">User ID:</span> {user.id}</p>
                </div>
              ) : (
                <p className="text-gray-500">User information not available</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-3">Related Item</h3>
              {item ? (
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {item.name}</p>
                  <p><span className="font-medium">Category:</span> {item.category}</p>
                  <p>
                    <span className="font-medium">Type:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.type}
                    </span>
                  </p>
                  <Link 
                    href={`/traceback-admin/items/${item.id}`}
                    className="inline-block text-[#FF385C] hover:text-[#E31C5F] text-sm font-medium"
                  >
                    View Item Details →
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500">No related item found</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => updateTicketStatus('in-progress')}
              disabled={ticket.status === 'in-progress'}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Mark In Progress
            </button>
            <button
              onClick={() => updateTicketStatus('closed')}
              disabled={ticket.status === 'closed'}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Close Ticket
            </button>
            <button
              onClick={() => updateTicketPriority('high')}
              disabled={ticket.priority === 'high'}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Set High Priority
            </button>
            <Link
              href={`/traceback-admin/tickets`}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to List
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}