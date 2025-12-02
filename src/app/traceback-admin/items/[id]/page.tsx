'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Item } from '@/types/item';
import { NotificationService } from '@/lib/notification-utils';

export default function AdminItemDetail() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchItem();
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

  // UPDATED: Handle Status Change + Email Notification
  const updateStatus = async (newStatus: Item['status']) => {
    if (!item) return;
    
    // Confirm resolution as it triggers email
    if (newStatus === 'resolved' && !confirm('Marking as RESOLVED will notify the user via email. Continue?')) {
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // --- NEW: Trigger Email Logic ---
      // Only send if status is resolved/found AND we have a user to notify
      if ((newStatus === 'resolved' || newStatus === 'found') && item.userEmail) {
        
        // 1. Send In-App Notification
        await NotificationService.createItemStatusUpdateNotification(
          item.userId,
          itemId,
          item.title,
          newStatus
        );

        // 2. Send Email
        const emailHtml = NotificationService.getResolvedEmailTemplate(
          item.userName || 'User',
          item.title,
          item.stationId
        );
        
        await NotificationService.sendEmail(
          item.userEmail,
          `Traceback Update: Item ${newStatus === 'resolved' ? 'Resolved' : 'Found'}`,
          emailHtml,
          itemId
        );
        
        alert(`Status updated to ${newStatus}. Email notification queued.`);
      } else {
        alert(`Status updated to ${newStatus}`);
      }
      
      setItem(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'items', itemId));
      router.push('/traceback-admin/items');
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!item) return <div className="p-8 text-center">Item not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link href="/traceback-admin/items" className="text-gray-500 hover:text-gray-900 flex items-center">
          ← Back to Inventory
        </Link>
        <button
          onClick={handleDelete}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Delete Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                item.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {item.type}
              </span>
            </div>
            <p className="text-gray-500 text-sm">ID: {item.id}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Current Status</label>
            <select
              value={item.status}
              onChange={(e) => updateStatus(e.target.value as Item['status'])}
              disabled={updating}
              className={`px-4 py-2 rounded-lg border font-medium cursor-pointer focus:ring-2 focus:ring-[#FF385C] ${
                item.status === 'open' ? 'bg-white border-gray-300 text-gray-900' :
                item.status === 'resolved' ? 'bg-green-50 border-green-200 text-green-700' :
                item.status === 'closed' ? 'bg-gray-100 border-gray-200 text-gray-500' :
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <option value="open">Open</option>
              <option value="claimed">Claimed</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Description</h3>
              <p className="text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-100">
                {item.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Category</h3>
                <p className="font-medium">{item.category}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Station</h3>
                <p className="font-medium">{item.stationId}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Mode</h3>
                <p className="font-medium">{item.mode}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Line</h3>
                <p className="font-medium">{item.line}</p>
              </div>
            </div>

            {/* User Info (if available) */}
            {(item.userEmail || item.userName) && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Reported By</h3>
                <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.userName || 'Unknown User'}</p>
                    <p className="text-xs text-gray-600">{item.userEmail}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Images */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Images</h3>
            {item.imageUrls && item.imageUrls.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {item.imageUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src={url} 
                      alt={`Item ${idx + 1}`} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                <span>No images uploaded</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}