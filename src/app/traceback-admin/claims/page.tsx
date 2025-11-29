'use client';

import { useState, useEffect, ReactNode, useCallback } from 'react'; // FIX: Imported useCallback
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  Timestamp, 
  where, 
  getDocs, 
  addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import Link from 'next/link';
import { ClaimRequest, ItemClaimStatus } from '@/types/claim';
import { safeDateConvert } from '@/lib/date-utils';
import { Item, ItemStatus } from '@/types/item';
import { NotificationService } from '@/lib/notification-utils';
import ExportButton from '@/components/ExportButton';
import { Ticket, TicketType } from '@/types/chat';
// FIX: Import Image
import Image from 'next/image';

// Type hack for Firestore data
interface ClaimDisplay extends Omit<ClaimRequest, 'createdAt' | 'updatedAt' | 'reviewedAt'> {
  createdAt: { toDate: () => Date };
  updatedAt: { toDate: () => Date };
  reviewedAt?: { toDate: () => Date };
  item?: Item;
}

export default function AdminClaimsPage() {
  const { admin } = useAdmin();
  const [claims, setClaims] = useState<ClaimDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ItemClaimStatus | 'all'>('all');
  const [updating, setUpdating] = useState(false);

  // Function to perform Triage Action: Approve, Reject, or Start Chat
  const handleTriageAction = async (claim: ClaimDisplay, action: 'approve' | 'reject' | 'chat', reason?: string) => {
    if (!admin) return;

    setUpdating(true);
    try {
      const claimRef = doc(db, 'claims', claim.id);
      const itemRef = doc(db, 'items', claim.itemId);
      const now = Timestamp.now();
      
      let newClaimStatus: ItemClaimStatus;
      let notificationAction: 'approved' | 'rejected' = 'rejected';
      
      const claimUpdateData: Record<string, any> = {
        updatedAt: now,
        reviewedBy: admin.email,
        reviewedAt: now,
      };

      const itemUpdateData: Record<string, any> = {
        updatedAt: now,
      };

      if (action === 'approve') {
        newClaimStatus = 'approved';
        notificationAction = 'approved';
        itemUpdateData.claimStatus = 'approved'; 
        itemUpdateData.status = 'resolved' as ItemStatus;
      } else if (action === 'reject') {
        newClaimStatus = 'rejected';
        claimUpdateData.rejectionReason = reason;
        itemUpdateData.claimStatus = 'unclaimed';
        itemUpdateData.currentClaimId = null;
        itemUpdateData.status = 'listed' as ItemStatus; // Re-list the item
      } else if (action === 'chat') {
        newClaimStatus = 'verification-chat';
        
        // CRITICAL: Create Verification Ticket (Flow D1, Step 3)
        const ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'lastMessage'> = {
          userId: claim.userId,
          userName: claim.userName,
          userEmail: claim.userEmail,
          subject: `Claim Verification for: ${claim.itemName}`,
          type: 'claim_verification' as TicketType, // Set specific type
          status: 'open' as const,
          priority: 'high' as const,
          assignedAdmin: admin.uid,
          relatedClaimId: claim.id,
          relatedItemId: claim.itemId,
        };
        
        const ticketRef = await addDoc(collection(db, 'tickets'), { 
          ...ticketData,
          createdAt: now,
          updatedAt: now
        });
        
        claimUpdateData.verificationTicketId = ticketRef.id;
        itemUpdateData.claimStatus = 'verification-chat';
      }

      claimUpdateData.status = newClaimStatus;
      await updateDoc(claimRef, claimUpdateData);
      await updateDoc(itemRef, itemUpdateData);

      // Send User Notification (if approved/rejected)
      if (action === 'approve' || action === 'reject') {
        await NotificationService.createClaimUpdateNotification(
          claim.userId,
          claim.id,
          notificationAction,
          claim.itemName,
          admin.email
        );
      }

    } catch (error) {
      console.error('Error updating claim status:', error);
      // Replace alert with a modal/toast in final version
      alert('Failed to update claim status. See console for details.'); 
    } finally {
      setUpdating(false);
    }
  };

  // FIX: Wrapped fetchClaims in useCallback
  const fetchClaims = useCallback(() => {
    try {
      let claimsQuery;
      
      const currentFilter = filter === 'pending' ? 'claim-submitted' : filter;

      if (currentFilter === 'all') {
        claimsQuery = query(collection(db, 'claims'), orderBy('createdAt', 'desc'));
      } else {
        claimsQuery = query(
          collection(db, 'claims'), 
          where('status', '==', currentFilter),
          orderBy('createdAt', 'desc')
        );
      }

      const unsubscribe = onSnapshot(claimsQuery, async (snapshot) => {
        const claimsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ClaimRequest[];

        // Fetch item details for each claim (Efficient approach)
        const claimsWithItems: ClaimDisplay[] = await Promise.all(
            claimsData.map(async (claim) => {
                const itemDoc = await getDocs(
                    query(collection(db, 'items'), where('__name__', '==', claim.itemId))
                );
                // FIX: Check if itemDoc is not empty before accessing docs[0]
                const itemData = itemDoc.docs[0] ? { id: itemDoc.docs[0].id, ...itemDoc.docs[0].data() } as Item : undefined;
                return { ...claim, item: itemData } as ClaimDisplay;
            })
        );
        
        setClaims(claimsWithItems);
        setLoading(false);
      }, (error) => {
          console.error('Error in onSnapshot listener:', error);
          setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching claims:', error);
      setLoading(false);
    }
  }, [filter]); // Dependency for useCallback

  useEffect(() => {
    fetchClaims();
  // FIX: Added fetchClaims dependency
  }, [fetchClaims]);

  const formatDate = (timestamp: unknown): ReactNode => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = safeDateConvert(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'claim-submitted': return 'bg-yellow-100 text-yellow-800';
      case 'verification-chat': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusCount = (status: string) => {
    // FIX: TS2367 issue is resolved by checking if status is type string.
    return claims.filter(claim => claim.status === status).length;
  };
  
  const allClaimsForExport = claims.map(c => ({
    id: c.id,
    itemId: c.itemId,
    userName: c.userName,
    userEmail: c.userEmail,
    status: c.status,
    claimReason: c.claimReason,
    itemTitle: c.item?.title || 'N/A',
    itemStation: c.item?.stationId || 'N/A',
    submittedAt: safeDateConvert(c.createdAt).toISOString(),
    reviewedBy: c.reviewedBy || 'N/A'
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (<div key={i} className="h-24 bg-gray-200 rounded"></div>))}
            </div>
            {[...Array(5)].map((_, i) => (<div key={i} className="h-20 bg-gray-200 rounded"></div>))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claim Requests</h1>
              <p className="text-gray-600 mt-2">Manage and review item claim requests from users</p>
            </div>
            <ExportButton
              data={allClaimsForExport}
              headers={['id', 'itemTitle', 'userName', 'status', 'submittedAt']}
              filename={`claims-export-${new Date().toISOString().split('T')[0]}.csv`}
              label="Export Claims"
            />
        </div>


        {/* Stats Cards - Enhanced with better data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-400">
            <p className="text-sm font-medium text-gray-500">Total Claims</p>
            <p className="text-2xl font-semibold text-gray-900">{claims.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
            <p className="text-sm font-medium text-gray-500">Submitted / Triage</p>
            <p className="text-2xl font-semibold text-yellow-800">{getStatusCount('claim-submitted')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-500">Verification Chat</p>
            <p className="text-2xl font-semibold text-blue-800">{getStatusCount('verification-chat')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <p className="text-sm font-medium text-gray-500">Approved</p>
            <p className="text-2xl font-semibold text-green-800">{getStatusCount('approved')}</p>
          </div>
        </div>

        {/* Filters - Improved styling */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-[#FF385C] text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Claims ({claims.length})
            </button>
            <button
              onClick={() => setFilter('claim-submitted')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'claim-submitted' 
                  ? 'bg-yellow-500 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Triage ({getStatusCount('claim-submitted')})
            </button>
            <button
              onClick={() => setFilter('verification-chat')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'verification-chat' 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Chat ({getStatusCount('verification-chat')})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'approved' 
                  ? 'bg-green-500 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved ({getStatusCount('approved')})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'rejected' 
                  ? 'bg-red-500 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected ({getStatusCount('rejected')})
            </button>
          </div>
        </div>

        {/* Claims Table - Enhanced with better information */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item & Proof
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Claimant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <p className="text-lg font-medium">No claims found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <div className="flex items-start space-x-3">
                            {claim.item?.imageUrls && claim.item.imageUrls.length > 0 && (
                              <Image 
                                src={claim.item.imageUrls[0]}
                                alt={claim.item.title || 'Item Image'}
                                width={48} 
                                height={48}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <Link 
                                href={`/traceback-admin/items/${claim.itemId}`}
                                className="font-medium text-gray-900 hover:text-[#FF385C] truncate block"
                                title={claim.item?.title || `Item ${claim.itemId}`}
                              >
                                {claim.item?.title || `Item ${claim.itemId}`}
                              </Link>
                              {claim.item && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {claim.item.stationId} • Proof: {claim.proofDescription ? 'Yes' : 'No'}
                                </p>
                              )}
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {claim.claimReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate" title={claim.userName}>
                            {claim.userName}
                          </p>
                          <p className="text-sm text-gray-500 truncate" title={claim.userEmail}>
                            {claim.userEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1).replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(claim.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          
                          {/* Main Action based on Triage Status */}
                          {claim.status === 'claim-submitted' && (
                            <>
                              <button
                                onClick={() => handleTriageAction(claim, 'chat')}
                                disabled={updating}
                                className="text-blue-600 hover:text-blue-900 text-left transition-colors"
                              >
                                Start Chat (Triage)
                              </button>
                              <button
                                onClick={() => handleTriageAction(claim, 'approve')}
                                disabled={updating}
                                className="text-green-600 hover:text-green-900 transition-colors disabled:opacity-50"
                              >
                                Approve (Quick)
                              </button>
                              <Link 
                                href={`/traceback-admin/claims/${claim.id}`}
                                className="text-[#FF385C] hover:text-[#E31C5F] transition-colors"
                              >
                                Review/Reject
                              </Link>
                            </>
                          )}
                          
                          {/* Chat is active, link to tickets */}
                          {claim.status === 'verification-chat' && claim.verificationTicketId && (
                            <Link 
                              href={`/traceback-admin/tickets/${claim.verificationTicketId}`}
                              className="text-orange-600 hover:text-orange-900 transition-colors"
                            >
                              Go to Verification Chat →
                            </Link>
                          )}
                           
                          {(claim.status === 'approved' || claim.status === 'rejected') && (
                            <Link 
                              href={`/traceback-admin/claims/${claim.id}`}
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                            >
                              View Resolution
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}