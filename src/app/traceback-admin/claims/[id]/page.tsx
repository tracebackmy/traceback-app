'use client';

import { useState, useEffect, useCallback } from 'react'; // FIX: Imported useCallback
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import { ClaimRequest, ItemClaimStatus } from '@/types/claim';
import { ItemStatus } from '@/types/item';
import { Ticket, TicketType } from '@/types/chat';
import { safeDateConvert } from '@/lib/date-utils';
import Link from 'next/link';
import { NotificationService } from '@/lib/notification-utils';
// FIX: Import Image
import Image from 'next/image';

// Type hack for Firestore data
interface ClaimDisplay extends Omit<ClaimRequest, 'createdAt' | 'updatedAt' | 'reviewedAt'> {
    createdAt: { toDate: () => Date };
    updatedAt: { toDate: () => Date };
    reviewedAt?: { toDate: () => Date };
    // FIX: Add item property definition for proper checking in UI
    item?: { status: ItemStatus }; 
}

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAdmin();
  const [claim, setClaim] = useState<ClaimDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [itemTitle, setItemTitle] = useState('Item'); 
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const claimId = params.id as string;

  // FIX: Wrap fetch in useCallback to satisfy exhaustive-deps lint rule
  const fetchClaimAndItem = useCallback(async () => {
      try {
        // 1. Fetch claim
        const claimDoc = await getDoc(doc(db, 'claims', claimId));
        if (!claimDoc.exists()) {
          router.push('/traceback-admin/claims');
          return;
        }
        const claimData = { id: claimDoc.id, ...claimDoc.data() } as ClaimDisplay;
        setClaim(claimData);
        
        // 2. Fetch associated item details for display
        const itemDoc = await getDoc(doc(db, 'items', claimData.itemId));
        if (itemDoc.exists()) {
          setItemTitle(itemDoc.data().title);
          // FIX: Manually set the item status on the claim display object for update logic
          claimData.item = { status: itemDoc.data().status as ItemStatus }; 
          setClaim(claimData);
        }

        // 3. Fetch verification ticket if one exists
        if (claimData.status === 'verification-chat' && !claimData.verificationTicketId) {
            const ticketsQuery = query(collection(db, 'tickets'), where('relatedClaimId', '==', claimId));
            const ticketsSnapshot = await getDocs(ticketsQuery);
            if (!ticketsSnapshot.empty) {
                const ticketId = ticketsSnapshot.docs[0].id;
                await updateDoc(doc(db, 'claims', claimId), { verificationTicketId: ticketId });
                setClaim(prev => (prev ? { ...prev, verificationTicketId: ticketId } : null));
            }
        }

      } catch (error) {
        console.error('Error fetching claim:', error);
      } finally {
        setLoading(false);
      }
    }, [claimId, router]); // Dependency for useCallback

  useEffect(() => {
    if (!claimId) return;
    fetchClaimAndItem();
  // FIX: Added fetchClaimAndItem to dependency array
  }, [claimId, router, fetchClaimAndItem]); 


  const updateClaimStatus = async (status: ItemClaimStatus, reason?: string) => {
    if (!admin || !claim) return;

    setUpdating(true);
    setStatusMessage(null);

    try {
      const claimRef = doc(db, 'claims', claim.id);
      const updateData: any = {
        status,
        reviewedAt: Timestamp.now(),
        reviewedBy: admin.email,
        updatedAt: Timestamp.now()
      };

      if (status === 'rejected' && reason) {
        updateData.rejectionReason = reason;
      } else {
        updateData.rejectionReason = null;
      }

      await updateDoc(claimRef, updateData);

      // Update the associated item
      const itemRef = doc(db, 'items', claim.itemId);
      const itemUpdate: any = {
        updatedAt: Timestamp.now(),
      };

      if (status === 'approved') {
        itemUpdate.claimStatus = 'approved';
        itemUpdate.status = 'resolved' as ItemStatus; // Item is marked resolved upon final approval
        setStatusMessage({ type: 'success', message: `Claim for '${itemTitle}' approved and item marked RESOLVED.` });
        await NotificationService.createClaimUpdateNotification(claim.userId, claim.id, 'approved', itemTitle, admin.email);
      } else if (status === 'rejected') {
        itemUpdate.claimStatus = 'unclaimed';
        itemUpdate.currentClaimId = null;
        itemUpdate.status = 'listed' as ItemStatus; // Item is re-listed
        setStatusMessage({ type: 'success', message: `Claim for '${itemTitle}' rejected and item re-listed.` });
        await NotificationService.createClaimUpdateNotification(claim.userId, claim.id, 'rejected', itemTitle, admin.email);
      }

      // FIX: Ensure claimStatus is explicitly added for the item update
      itemUpdate.claimStatus = itemUpdate.claimStatus || claim.claimStatus;


      await updateDoc(itemRef, itemUpdate);

      // Re-fetch claim data for immediate UI update
      const updatedClaimDoc = await getDoc(claimRef);
      setClaim({ id: updatedClaimDoc.id, ...updatedClaimDoc.data() } as ClaimDisplay);

      setRejectionReason(''); 
    } catch (error) {
      console.error('Error updating claim:', error);
      setStatusMessage({ type: 'error', message: 'Failed to update claim status.' });
    } finally {
      setUpdating(false);
    }
  };
  
  // CRITICAL: Function to start verification chat ticket
  const startVerificationChat = async () => {
    if (!admin || !claim || claim.verificationTicketId) return;
    
    setUpdating(true);
    setStatusMessage(null);
    try {
        const now = Timestamp.now();
        // 1. Create the verification ticket
        const ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'lastMessage'> = {
            userId: claim.userId,
            userName: claim.userName,
            userEmail: claim.userEmail,
            subject: `Verification needed for item claim: ${itemTitle}`,
            type: 'claim_verification' as TicketType,
            status: 'open' as const,
            priority: 'high' as const,
            assignedAdmin: admin.uid,
            relatedClaimId: claim.id,
            relatedItemId: claim.itemId,
        };
        
        const ticketRef = await addDoc(collection(db, 'tickets'), { ...ticketData, createdAt: now, updatedAt: now });
        
        // 2. Update claim status and link the ticket ID
        await updateDoc(doc(db, 'claims', claim.id), {
            status: 'verification-chat' as ItemClaimStatus,
            verificationTicketId: ticketRef.id,
            updatedAt: now
        });
        
        // 3. Update item status to reflect 'in chat verification'
        await updateDoc(doc(db, 'items', claim.itemId), {
            claimStatus: 'verification-chat' as ItemClaimStatus,
            updatedAt: now
        });
        
        // Re-fetch claim
        const updatedClaimDoc = await getDoc(doc(db, 'claims', claim.id));
        setClaim({ id: updatedClaimDoc.id, ...updatedClaimDoc.data() } as ClaimDisplay);
        
        setStatusMessage({ type: 'success', message: 'Verification chat started successfully! Redirecting...' });
        
        // Redirect to the new chat ticket after a delay
        setTimeout(() => router.push(`/traceback-admin/tickets/${ticketRef.id}`), 1500);

    } catch (error) {
        console.error('Error starting verification chat:', error);
        setStatusMessage({ type: 'error', message: 'Failed to start verification chat.' });
    } finally {
        setUpdating(false);
    }
  }


  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'N/A';
    try {
      const date = safeDateConvert(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };
  
  const getStatusColor = (status: ItemClaimStatus) => {
    switch (status) {
      case 'claim-submitted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'verification-chat': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'unclaimed':
      case 'cancelled': 
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]"></div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Not Found</h1>
          <Link href="/traceback-admin/claims" className="text-[#FF385C] hover:text-[#E31C5F]">
            Back to Claims
          </Link>
        </div>
      </div>
    );
  }

  const isFinalStatus = claim.status === 'approved' || claim.status === 'rejected';
  const isTriagePending = claim.status === 'claim-submitted';
  const isChatActive = claim.status === 'verification-chat';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/traceback-admin/claims"
          className="inline-flex items-center text-[#FF385C] hover:text-[#E31C5F] mb-6"
        >
          ← Back to Claims
        </Link>
        
        {/* Status Message Display */}
        {statusMessage && (
          <div className={`p-4 mb-6 rounded-lg border ${
            statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="font-medium">{statusMessage.message}</p>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#FF385C] text-white p-6">
            <h1 className="text-2xl font-bold">Review Claim: {itemTitle}</h1>
            <p className="opacity-90 mt-2">Claim ID: {claim.id}</p>
            <span className={`mt-3 inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(claim.status)}`}>
              Status: {claim.status.toUpperCase().replace('-', ' ')}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Item Information Link */}
            <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <span className="font-semibold text-gray-700">Item: {itemTitle}</span>
                <Link
                    href={`/traceback-admin/items/${claim.itemId}`}
                    className="text-[#FF385C] hover:text-[#E31C5F] text-sm font-medium"
                >
                    View Item Details →
                </Link>
            </div>


            {/* Claimant Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Claimant Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{claim.userName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{claim.userEmail}</p>
                </div>
                {claim.userPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{claim.userPhone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Claim Details & Proof */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Details & Proof</h2>
              <div className="space-y-4">
                <div className='bg-gray-50 p-3 rounded-lg'>
                  <label className="block text-sm font-medium text-gray-700">Claim Reason</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{claim.claimReason}</p>
                </div>
                {claim.proofDescription && (
                  <div className='bg-gray-50 p-3 rounded-lg'>
                    <label className="block text-sm font-medium text-gray-700">Additional Proof</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{claim.proofDescription}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Reason (if rejected) */}
            {claim.status === 'rejected' && claim.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
                <p className="mt-1 text-sm text-red-700">{claim.rejectionReason}</p>
              </div>
            )}
            
            {/* ACTION CENTER - Triage/Chat/Final Decision */}
            <div className='border-t border-gray-200 pt-6'>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Triage & Decision</h3>
                
                {/* 1. Triage Pending */}
                {isTriagePending && (
                    <div className='space-y-4'>
                        <p className='text-gray-600'>Based on the submitted proof, decide whether to approve immediately or start a verification chat.</p>
                        <div className='flex gap-3'>
                            <button
                                onClick={() => updateClaimStatus('approved')}
                                disabled={updating}
                                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                            >
                                {updating ? 'Approving...' : 'Approve (Proof Sufficient)'}
                            </button>
                            <button
                                onClick={startVerificationChat}
                                disabled={updating}
                                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                {updating ? 'Starting Chat...' : 'Start Verification Chat'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. Chat Active */}
                {isChatActive && (
                    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3'>
                        <h4 className="font-semibold text-blue-900">Verification in Progress</h4>
                        <p className="text-blue-800">Additional proof is being verified via chat.</p>
                        <Link
                            href={`/traceback-admin/tickets/${claim.verificationTicketId}`}
                            className="inline-block text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Go to Chat ({claim.verificationTicketId ? 'Active' : 'Missing ID'})
                        </Link>
                    </div>
                )}

                {/* 3. Rejection Field & Button (for Triage or Chat resolution) */}
                {!isFinalStatus && (isTriagePending || isChatActive) && (
                    <div className='mt-6 space-y-3'>
                        <h4 className="font-semibold text-gray-900 mb-2">Reject Claim</h4>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Provide a clear reason for rejection (mandatory for user feedback)..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent resize-none"
                        />
                        <button
                            onClick={() => {
                                if (rejectionReason.trim()) {
                                    updateClaimStatus('rejected', rejectionReason.trim());
                                } else {
                                    setStatusMessage({ type: 'error', message: 'Rejection reason is mandatory for user clarity.' });
                                }
                            }}
                            disabled={updating}
                            className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {updating ? 'Rejecting...' : 'Reject Claim'}
                        </button>
                    </div>
                )}
            </div>

            {/* Timestamps and Resolution Status */}
            <div className='border-t border-gray-200 pt-6'>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Submitted</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(claim.createdAt)}</p>
                    </div>
                    {claim.reviewedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reviewed At</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(claim.reviewedAt)}</p>
                      </div>
                    )}
                    {claim.reviewedBy && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reviewed By</label>
                        <p className="mt-1 text-sm text-gray-900">{claim.reviewedBy}</p>
                      </div>
                    )}
                </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}