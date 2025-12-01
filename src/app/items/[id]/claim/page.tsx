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

export default function ClaimItemPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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

      // Check validation
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
      // 1. Delete the claim document
      await deleteDoc(doc(db, 'claims', userClaim.id));

      // 2. Update the item status back to unclaimed
      // Only do this if the item was pending on THIS claim
      if (item.currentClaimId === userClaim.id) {
        await updateDoc(doc(db, 'items', item.id), {
          claimStatus: 'unclaimed',
          currentClaimId: null,
          updatedAt: Timestamp.now()
        });
      }

      // 3. Reset local state
      setUserClaim(null);
      alert('Claim withdrawn successfully.');
      fetchItemAndClaim(); // Refresh data
    } catch (error) {
      console.error('Error withdrawing claim:', error);
      alert('Failed to withdraw claim');
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
    // If item is unclaimed OR if user has no active claim
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

  // View: User has already claimed the item
  if (userClaim) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Status: {userClaim.status.toUpperCase()}</h1>
            <p className="text-gray-600 mb-6">
              You submitted a claim for <strong>{item.title}</strong>.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto mb-6">
              <p className="text-sm"><strong>Reason Provided:</strong> {userClaim.claimReason}</p>
              <p className="text-sm mt-2 text-gray-500">Submitted on: {new Date(userClaim.createdAt.toDate()).toLocaleDateString()}</p>
            </div>

            <div className="flex justify-center gap-4">
              <Link href="/auth/dashboard" className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                Back to Dashboard
              </Link>
              
              {userClaim.status === 'pending' && (
                <button
                  onClick={handleWithdrawClaim}
                  disabled={withdrawing}
                  className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw Claim'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View: Success message after immediate submission
  if (claimSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Claim Submitted!</h1>
          <p className="mb-6">The admin will review your request shortly.</p>
          <button onClick={() => window.location.reload()} className="text-[#FF385C] underline">View Status</button>
        </div>
      </div>
    );
  }

  // View: Default Claim Form
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href={`/items/${item.id}`} className="text-[#FF385C] font-medium">← Back to Item</Link>
          <div className="flex justify-between items-center mt-2">
            <h1 className="text-3xl font-bold text-gray-900">Claim Item</h1>
            {item.claimStatus && <ClaimStatusBadge status={item.claimStatus} />}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">{item.title}</h2>
          
          {canClaimItem() ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-6">
                To claim this item, please provide proof of ownership. This helps us ensure the item is returned to the right person.
              </p>
              <button
                onClick={() => setShowClaimModal(true)}
                className="bg-[#FF385C] text-white px-8 py-3 rounded-lg hover:bg-[#E31C5F] shadow-sm font-medium"
              >
                Start Claim Process
              </button>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                This item is currently not available for claims (Status: {item.claimStatus}).
              </p>
            </div>
          )}
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