'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import ClaimModal from '@/components/ClaimModal';
import ClaimStatusBadge from '@/components/ClaimStatusBadge';
import Link from 'next/link';
import { Item } from '@/types/item';
import { ClaimRequest } from '@/types/claim';
import { useToast } from '@/components/ToastProvider';

export default function ClaimItemPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const itemId = params.id as string;
  
  const [item, setItem] = useState<Item | null>(null);
  const [userClaim, setUserClaim] = useState<ClaimRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');

  const fetchItemAndClaim = useCallback(async () => {
    try {
      // 1. Fetch Item
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (!itemDoc.exists()) {
        setError('Item not found');
        return;
      }
      
      const itemData = { id: itemDoc.id, ...itemDoc.data() } as Item;
      setItem(itemData);

      // 2. Fetch User's Claim for this item (if logged in)
      if (user) {
        const q = query(
          collection(db, 'claims'),
          where('itemId', '==', itemId),
          where('userId', '==', user.uid)
        );
        const claimSnapshot = await getDocs(q);
        if (!claimSnapshot.empty) {
          const claimData = { id: claimSnapshot.docs[0].id, ...claimSnapshot.docs[0].data() } as ClaimRequest;
          setUserClaim(claimData);
        } else {
          setUserClaim(null);
        }
      }

      if (itemData.userId === user?.uid) {
        setError('You cannot claim your own item');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [itemId, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchItemAndClaim();
  }, [itemId, user, authLoading, router, fetchItemAndClaim]);

  const handleWithdrawClaim = async () => {
    if (!userClaim || !item) return;
    if (!confirm('Are you sure you want to withdraw your claim? This action cannot be undone.')) return;

    setWithdrawing(true);
    try {
      await deleteDoc(doc(db, 'claims', userClaim.id));

      if (item.currentClaimId === userClaim.id) {
        await updateDoc(doc(db, 'items', item.id), {
          claimStatus: 'unclaimed',
          currentClaimId: null,
          updatedAt: Timestamp.now()
        });
      }

      setUserClaim(null);
      showToast('Claim withdrawn successfully', 'success');
      fetchItemAndClaim(); 
    } catch (error) {
      console.error('Error withdrawing claim:', error);
      showToast('Failed to withdraw claim', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleClaimSubmitted = () => {
    setClaimSuccess(true);
    fetchItemAndClaim();
  };

  const canClaimItem = () => {
    if (!user) return false;
    if (!item) return false;
    if (item.userId === user.uid) return false;
    if (item.claimStatus === 'unclaimed' && !userClaim) return true;
    return false;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (!item) {
    return (
      <div className="p-8 text-center max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Item Not Found</h1>
        <Link href="/browse" className="text-[#FF385C] hover:underline">Back to Browse</Link>
      </div>
    );
  }

  if (userClaim) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-blue-200 p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">📝</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Status: {userClaim.status.toUpperCase()}</h1>
            <p className="text-gray-600 mb-6">
              You submitted a claim for <strong>{item.title}</strong>.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg text-left mb-6 border border-gray-100">
              <p className="text-sm text-gray-800"><strong>Reason:</strong> {userClaim.claimReason}</p>
              <p className="text-xs mt-2 text-gray-500">Submitted on: {new Date(userClaim.createdAt.toDate()).toLocaleDateString()}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/auth/dashboard" className="btn-primary">
                Go to Dashboard
              </Link>
              
              {userClaim.status === 'pending' && (
                <button
                  onClick={handleWithdrawClaim}
                  disabled={withdrawing}
                  className="w-full bg-white text-red-600 font-medium py-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw Claim'}
                </button>
              )}
            </div>
        </div>
      </div>
    );
  }

  if (claimSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Claim Submitted!</h1>
          <p className="mb-6 text-gray-600">The admin will review your request shortly.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">View Status</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href={`/items/${item.id}`} className="text-gray-500 hover:text-gray-900 font-medium flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Item
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Claim Item</h1>
            {item.claimStatus && <ClaimStatusBadge status={item.claimStatus} />}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">{error}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col md:flex-row gap-8 items-center">
             <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h2>
                <p className="text-gray-500 mb-6">{item.description}</p>
                {canClaimItem() ? (
                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="btn-primary md:w-auto"
                  >
                    Start Claim Process
                  </button>
                ) : (
                  <div className="inline-block px-4 py-3 bg-gray-100 rounded-lg text-gray-600 font-medium">
                    This item is currently not available for claims.
                  </div>
                )}
             </div>
             {item.imageUrls && item.imageUrls.length > 0 && (
                <div className="w-full md:w-1/3 relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                   <img src={item.imageUrls[0]} alt={item.title} className="object-cover w-full h-full" />
                </div>
             )}
          </div>
        </div>
      </div>

      {showClaimModal && item && (
        <ClaimModal
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          itemId={item.id}
          itemName={item.title}
          onClaimSubmitted={handleClaimSubmitted}
        />
      )}
    </div>
  );
}