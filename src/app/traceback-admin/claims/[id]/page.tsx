'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import { ClaimRequest, ItemClaimStatus } from '@/types/claim';
import { ItemStatus, Item } from '@/types/item';
import { Ticket, TicketType } from '@/types/chat';
import { NotificationService } from '@/lib/notification-utils';

// Use a more permissive interface for display
interface ClaimDisplay extends Omit<ClaimRequest, 'createdAt' | 'updatedAt' | 'reviewedAt'> {
    createdAt: any;
    updatedAt: any;
    reviewedAt?: any;
    item?: { 
        status: ItemStatus; 
        title: string; 
        imageUrls: string[];
        category: string;
        stationId: string;
        type: 'lost' | 'found';
    }; 
}

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAdmin();
  const [claim, setClaim] = useState<ClaimDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const claimId = params.id as string;

  const fetchClaimAndItem = useCallback(async () => {
      try {
        const claimDoc = await getDoc(doc(db, 'claims', claimId));
        if (!claimDoc.exists()) {
          router.push('/traceback-admin/claims');
          return;
        }
        const claimData = { id: claimDoc.id, ...claimDoc.data() } as ClaimDisplay;
        
        const itemDoc = await getDoc(doc(db, 'items', claimData.itemId));
        if (itemDoc.exists()) {
          const itemData = itemDoc.data() as Item;
          claimData.item = { 
              status: itemData.status,
              title: itemData.title,
              imageUrls: itemData.imageUrls,
              category: itemData.category,
              stationId: itemData.stationId,
              type: itemData.type
          }; 
        }

        if (claimData.status === 'verification-chat' && !claimData.verificationTicketId) {
            const ticketsQuery = query(collection(db, 'tickets'), where('relatedClaimId', '==', claimId));
            const ticketsSnapshot = await getDocs(ticketsQuery);
            if (!ticketsSnapshot.empty) {
                const ticketId = ticketsSnapshot.docs[0].id;
                await updateDoc(doc(db, 'claims', claimId), { verificationTicketId: ticketId });
                claimData.verificationTicketId = ticketId;
            }
        }
        setClaim(claimData);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }, [claimId, router]);

  useEffect(() => {
    if (claimId) fetchClaimAndItem();
  }, [claimId, fetchClaimAndItem]); 

  const updateClaimStatus = async (status: ItemClaimStatus, reason?: string) => {
    if (!admin || !claim) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'claims', claim.id), {
        status,
        rejectionReason: status === 'rejected' ? reason : null,
        reviewedAt: Timestamp.now(),
        reviewedBy: admin.email
      });

      const itemUpdate: any = { updatedAt: Timestamp.now() };
      if (status === 'approved') {
        itemUpdate.claimStatus = 'approved';
        itemUpdate.status = 'resolved' as ItemStatus;
        await NotificationService.createClaimUpdateNotification(claim.userId, claim.id, 'approved', claim.item?.title || 'Item');
      } else if (status === 'rejected') {
        itemUpdate.claimStatus = 'unclaimed';
        itemUpdate.currentClaimId = null;
        itemUpdate.status = 'listed' as ItemStatus;
        await NotificationService.createClaimUpdateNotification(claim.userId, claim.id, 'rejected', claim.item?.title || 'Item');
      } else if (status === 'verification-chat') {
         itemUpdate.claimStatus = 'verification-chat';
      }

      await updateDoc(doc(db, 'items', claim.itemId), itemUpdate);
      fetchClaimAndItem();
      setStatusMessage({ type: 'success', message: `Claim ${status}` });
    } catch (e) {
      console.error(e);
      setStatusMessage({ type: 'error', message: 'Update failed' });
    } finally {
      setUpdating(false);
    }
  };
  
  const startVerificationChat = async () => {
      if(!admin || !claim) return;
      setUpdating(true);
      try {
        const ticketData = {
            userId: claim.userId,
            userName: claim.userName,
            userEmail: claim.userEmail,
            subject: `Verification: ${claim.item?.title || 'Item'}`,
            type: 'claim_verification' as TicketType,
            status: 'open' as const,
            priority: 'high' as const,
            assignedAdmin: admin.uid,
            relatedClaimId: claim.id,
            relatedItemId: claim.itemId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        const ref = await addDoc(collection(db, 'tickets'), ticketData);
        await updateDoc(doc(db, 'claims', claim.id), { verificationTicketId: ref.id, status: 'verification-chat' });
        await updateDoc(doc(db, 'items', claim.itemId), { claimStatus: 'verification-chat' });
        
        router.push(`/traceback-admin/tickets/${ref.id}`);
      } catch(e) {
          console.error(e);
      } finally {
          setUpdating(false);
      }
  };

  if (loading) return <div>Loading...</div>;
  if (!claim) return <div>Claim not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Claim Review: {claim.item?.title || 'Item'}</h1>
        {statusMessage && <div className={`p-4 mb-4 rounded ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{statusMessage.message}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 shadow-sm rounded-lg border border-gray-200">
                <h2 className="font-bold text-lg mb-4 border-b pb-2">Claimant Info</h2>
                <p><strong>Name:</strong> {claim.userName}</p>
                <p><strong>Email:</strong> {claim.userEmail}</p>
                <p className="mt-4"><strong>Reason:</strong></p>
                <p className="bg-gray-50 p-3 rounded mt-1">{claim.claimReason}</p>
                {claim.proofDescription && (
                    <>
                        <p className="mt-4"><strong>Proof:</strong></p>
                        <p className="bg-gray-50 p-3 rounded mt-1">{claim.proofDescription}</p>
                    </>
                )}
            </div>
            
            <div className="bg-white p-6 shadow-sm rounded-lg border border-gray-200">
                <h2 className="font-bold text-lg mb-4 border-b pb-2">Actions</h2>
                <p className="mb-4">Current Status: <span className="font-semibold capitalize">{claim.status}</span></p>
                
                <div className="space-y-3">
                    <button onClick={() => updateClaimStatus('approved')} disabled={updating} className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Approve Claim</button>
                    <button onClick={startVerificationChat} disabled={updating || !!claim.verificationTicketId} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        {claim.verificationTicketId ? 'Chat Active' : 'Start Verification Chat'}
                    </button>
                    
                    <div className="pt-4 border-t mt-4">
                        <input 
                            type="text" 
                            placeholder="Rejection reason..." 
                            className="w-full border p-2 rounded mb-2"
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                        />
                        <button 
                            onClick={() => updateClaimStatus('rejected', rejectionReason)} 
                            disabled={updating || !rejectionReason} 
                            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            Reject Claim
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}