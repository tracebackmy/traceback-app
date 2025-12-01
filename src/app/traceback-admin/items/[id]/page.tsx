'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import { Item } from '@/types/item';
import { NotificationService } from '@/lib/notification-utils';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAdmin();
  const itemId = params.id as string;

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const fetchItem = async () => {
    try {
      const docRef = doc(db, 'items', itemId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setItem({ id: docSnap.id, ...docSnap.data() } as Item);
      } else {
        router.push('/traceback-admin/items');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: Item['status']) => {
    if (!item) return;
    if (!confirm(`Are you sure you want to mark this item as ${newStatus}?`)) return;

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      // Send notification to the user if status changed to resolved/found
      if (newStatus === 'resolved') {
        await NotificationService.createItemStatusUpdateNotification(
          item.userId,
          item.id,
          item.title,
          'Resolved (Found)'
        );
      }

      setItem(prev => prev ? { ...prev, status: newStatus } : null);
      alert('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!item || !admin) return;

    setUpdating(true);
    try {
      // Create a ticket initiated by Admin
      const ticketData = {
        userId: item.userId,
        userName: item.userName || 'User', // Fallback if name not saved on item
        userEmail: item.userEmail || 'No Email',
        subject: `Admin Inquiry: ${item.title}`,
        description: `Admin has opened a ticket regarding your reported item: ${item.title}`,
        status: 'open',
        priority: 'medium',
        itemId: item.id,
        assignedAdmin: admin.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const ticketRef = await addDoc(collection(db, 'tickets'), ticketData);
      
      // Notify User
      await NotificationService.createNewTicketNotification(item.userId, ticketRef.id);

      router.push(`/traceback-admin/tickets/${ticketRef.id}`);
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]"></div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/traceback-admin/items"
            className="text-[#FF385C] hover:text-[#E31C5F] font-medium flex items-center"
          >
            ← Back to Items
          </Link>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              item.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {item.type.toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              item.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {item.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Item Details Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
                <p className="text-gray-500 mt-1">ID: {item.id}</p>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <p className="mt-1 text-lg text-gray-900">{item.category}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Station / Location</h3>
                  <p className="mt-1 text-lg text-gray-900">{item.stationId} ({item.mode})</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date Reported</h3>
                  <p className="mt-1 text-gray-900">{formatDate(item.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Last Update</h3>
                  <p className="mt-1 text-gray-900">{formatDate(item.updatedAt)}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="mt-2 text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Images Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Images</h2>
              {item.imageUrls && item.imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {item.imageUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <Image 
                        src={url} 
                        alt={`Item image ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No images uploaded.</p>
              )}
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            
            {/* Action Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {item.status === 'open' && (
                  <button
                    onClick={() => handleStatusChange('resolved')}
                    disabled={updating}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Mark as Resolved / Found'}
                  </button>
                )}
                
                {item.status !== 'closed' && (
                  <button
                    onClick={() => handleStatusChange('closed')}
                    disabled={updating}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Close Item (Archived)
                  </button>
                )}

                {item.status !== 'open' && (
                  <button
                    onClick={() => handleStatusChange('open')}
                    disabled={updating}
                    className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Re-open Item
                  </button>
                )}
              </div>
            </div>

            {/* User Info & Contact */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Reporter Info</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.userName || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500">ID: {item.userId.substring(0, 8)}...</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <p className="text-sm"><span className="text-gray-500">Email:</span> {item.userEmail || 'N/A'}</p>
                  <p className="text-sm"><span className="text-gray-500">Preference:</span> {item.contactPreference}</p>
                </div>

                <button
                  onClick={handleCreateTicket}
                  disabled={updating}
                  className="w-full mt-4 bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {updating ? 'Opening...' : 'Open Chat Ticket'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}