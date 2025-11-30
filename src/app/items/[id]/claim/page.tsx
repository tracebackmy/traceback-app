'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import ClaimModal from '@/components/ClaimModal';
import ClaimStatusBadge from '@/components/ClaimStatusBadge';
import Link from 'next/link';
import Image from 'next/image';
import { Item } from '@/types/item'; 
import { safeDateConvert } from '@/lib/date-utils';

// Flexible interface for display
interface ItemDisplay extends Omit<Item, 'createdAt'> {
    createdAt: any; 
}

export default function ClaimItemPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, uid } = useAuth(); 
  const itemId = params.id as string;
  
  const [item, setItem] = useState<ItemDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [fetchError, setFetchError] = useState(''); 
  
  const fetchItem = useCallback(async () => {
    try {
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (itemDoc.exists()) {
        const itemData = {
          id: itemDoc.id,
          ...itemDoc.data()
        } as ItemDisplay;
        setItem(itemData);
        
        let newError = '';
        if (itemData.userId === uid) { 
          newError = 'You cannot claim your own lost item.';
        } else if (itemData.claimStatus !== 'unclaimed') {
          newError = `Item is currently ${itemData.claimStatus}.`;
        } else if (itemData.type !== 'found' || itemData.status !== 'listed') {
          newError = 'Item not available for claim.';
        }
        setFetchError(newError);
      } else {
        setFetchError('Item not found');
      }
    } catch (error) {
      console.error('Error fetching:', error);
      setFetchError('Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [itemId, uid]); 

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (itemId) {
      fetchItem();
    }
  }, [itemId, user, authLoading, router, fetchItem]); 

  const handleClaimSubmitted = () => {
    setClaimSuccess(true);
    setTimeout(() => fetchItem(), 1000);
  };

  const canClaimItem = () => {
    return !!user && !!item && !fetchError && item.claimStatus === 'unclaimed' && item.status === 'listed';
  };

  if (loading || authLoading) return <div className="min-h-screen bg-gray-50 p-6">Loading...</div>;
  if (!item) return <div className="p-8 text-center">Item Not Found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href={`/items/${item.id}`} className="text-[#FF385C] hover:underline">← Back</Link>
          <div className="flex justify-between items-center mt-4">
             <h1 className="text-3xl font-bold text-gray-900">Claim This Item</h1>
             {item.claimStatus && <ClaimStatusBadge status={item.claimStatus} size="lg" />}
          </div>
        </div>
        
        {fetchError && <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{fetchError}</div>}

        {/* Item Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex gap-6">
                <div className="w-32 h-32 relative flex-shrink-0">
                     {item.imageUrls && item.imageUrls.length > 0 ? (
                        <Image src={item.imageUrls[0]} alt={item.title} fill className="object-cover rounded" />
                     ) : (
                        <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-400">No Img</div>
                     )}
                </div>
                <div>
                    <h2 className="text-xl font-bold">{item.title}</h2>
                    <p className="text-gray-600">{item.description}</p>
                </div>
            </div>
        </div>

        {/* Action Area */}
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            {canClaimItem() ? (
                 <button onClick={() => setShowClaimModal(true)} className="bg-[#FF385C] text-white px-8 py-3 rounded hover:bg-[#E31C5F]">Start Claim</button>
            ) : (
                 <p className="text-gray-500">Claim unavailable</p>
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