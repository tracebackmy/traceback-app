'use client';

import { useState, useEffect, useCallback } from 'react'; // FIX: Imported useCallback
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import ClaimModal from '@/components/ClaimModal';
import ClaimStatusBadge from '@/components/ClaimStatusBadge';
import Link from 'next/link';
import Image from 'next/image'; // FIX: Added missing Image import
import { Item } from '@/types/item'; 
import { safeDateConvert } from '@/lib/date-utils';

// Type hack for Firestore data
interface ItemDisplay extends Item {
    createdAt: { toDate: () => Date };
}

export default function ClaimItemPage() {
  const params = useParams();
  const router = useRouter();
  // FIX: Destructure uid and email for dependency array
  const { user, loading: authLoading, uid, email } = useAuth(); 
  const itemId = params.id as string;
  
  const [item, setItem] = useState<ItemDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  // FIX: error is declared but never used on the component level (only used in fetchItem), removed use of setError/error state
  const [fetchError, setFetchError] = useState(''); 
  
  // FIX: Unused ADMIN_REPORTED_ID removed here

  // FIX: Wrapped fetchItem in useCallback to satisfy exhaustive-deps lint rule
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

        // 1. Cannot claim own item (LOST item reported by owner)
        if (itemData.userId === uid) { 
          newError = 'You cannot claim this item because you reported it as lost. Please check your dashboard for matching updates.';
        } 
        // 2. Item must be available
        else if (itemData.claimStatus !== 'unclaimed') {
          newError = `This item is currently ${itemData.claimStatus.toUpperCase().replace('-', ' ')}.`;
        } 
        // 3. Item must be officially listed (found item)
        else if (itemData.type !== 'found' || itemData.status !== 'listed') {
          newError = 'This item is not currently listed as found or is still under verification.';
        }
        
        setFetchError(newError);
      } else {
        setFetchError('Item not found');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      setFetchError('Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [itemId, uid]); // Dependencies for useCallback

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (itemId) {
      fetchItem();
    }
  // FIX: Added fetchItem to dependency array
  }, [itemId, user, authLoading, router, fetchItem]); 

  const handleClaimSubmitted = () => {
    setClaimSuccess(true);
    // Refresh item data to show updated claim status
    setTimeout(() => {
      fetchItem();
    }, 1000);
  };

  const formatDate = (timestamp: unknown) => {
    try {
      return safeDateConvert(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const canClaimItem = () => {
    // Requires successful auth, item data, no current error, and status must be 'unclaimed' and 'listed'
    // FIX: Using fetchError state
    return !!user && !!item && !fetchError && item.claimStatus === 'unclaimed' && item.status === 'listed';
  };

  // --- UI Rendering remains the same ---
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            {/* Back button skeleton */}
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            
            {/* Header skeleton */}
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>

            {/* Item card skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Item Not Found</h1>
            <p className="text-gray-600 mb-6">
              {fetchError || 'The item you are looking for does not exist or may have been removed.'}
            </p>
            <Link 
              href="/browse" 
              className="inline-flex items-center bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Browse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (claimSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-green-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Submitted Successfully!</h1>
            <p className="text-gray-600 mb-4">
              Your claim for <strong>&apos;{item.title}&apos;</strong> has been submitted for review.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-green-800 text-sm">
                <strong>What happens next?</strong> Our admin team will review your initial proof (Claim Triage). You will receive an in-app notification and email if more verification is needed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={() => {
                  setClaimSuccess(false);
                  fetchItem();
                }}
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                View Item Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={`/items/${item.id}`}
            className="inline-flex items-center text-[#FF385C] hover:text-[#E31C5F] mb-4 font-medium transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Item Details
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claim This Item</h1>
              <p className="text-gray-600 mt-2">Submit a claim request to verify this item belongs to you</p>
            </div>
            {item.claimStatus && (
              <ClaimStatusBadge status={item.claimStatus} size="lg" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-red-800 font-medium">Unable to Claim Item</p>
                <p className="text-red-700 text-sm mt-1">{fetchError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Item Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Item Snapshot: {item.title}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Item Image */}
            <div className="md:col-span-1 space-y-4">
              {item.imageUrls && item.imageUrls.length > 0 ? (
                <Image 
                  src={item.imageUrls[0]}
                  alt={item.title}
                  width={200}
                  height={200}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 mt-2">No Image Available</p>
                  </div>
                </div>
              )}
              
              {/* Additional item context */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Found Location</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Station</p>
                    <p className="font-medium">{item.stationId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Transit Line</p>
                    <p className="font-medium">{item.line}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Mode</p>
                    <p className="font-medium">{item.mode}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Reported</p>
                    <p className="font-medium">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Information */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                <p className="text-gray-600 mt-2 leading-relaxed">{item.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Category</p>
                  <p className="font-semibold text-gray-900">{item.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Type</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    item.type === 'found' 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    item.status === 'open' 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    item.status === 'claimed' 
                      ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Contact Preference</p>
                  <p className="font-semibold text-gray-900 capitalize">{item.contactPreference}</p>
                </div>
              </div>

              {/* Claim Status Information */}
              {item.claimStatus !== 'unclaimed' && (
                <div className={`p-4 rounded-lg ${
                  item.claimStatus === 'claim-pending' 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start">
                    <svg className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${
                      item.claimStatus === 'claim-pending' ? 'text-yellow-600' : 'text-red-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className={`font-medium ${
                        item.claimStatus === 'claim-pending' ? 'text-yellow-800' : 'text-red-800'
                      }`}>
                        {item.claimStatus === 'claim-pending' 
                          ? 'Claim Under Review' 
                          : 'Item Already Claimed'
                        }
                      </p>
                      <p className={`text-sm mt-1 ${
                        item.claimStatus === 'claim-pending' ? 'text-yellow-700' : 'text-red-700'
                      }`}>
                        {item.claimStatus === 'claim-pending'
                          ? 'This item has a pending claim request. Please check back later for updates.'
                          : 'This item has been successfully claimed by its owner.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Claim Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Before You Claim
          </h3>
          <ul className="text-blue-800 space-y-3">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Provide specific details about when and where you lost the item</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Include unique features, brand, color, serial numbers, or distinctive marks</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Mention any purchase receipts, photos, or other proof of ownership</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Our admin team will review your claim and contact you for verification</span>
            </li>
          </ul>
        </div>

        {/* Claim Action Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {user ? (
            <div className="text-center">
              {canClaimItem() ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Ready to Claim This Item?</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Provide details to help us verify this item belongs to you. The more specific information you provide, the faster we can process your claim.
                  </p>
                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="bg-[#FF385C] text-white px-8 py-4 rounded-lg hover:bg-[#E31C5F] font-medium transition-colors shadow-sm hover:shadow-md"
                  >
                    Start Claim Process
                  </button>
                  <p className="text-sm text-gray-500 mt-4">
                    You&apos;ll be asked to provide verification details in the next step
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Unable to Claim This Item</h3>
                  <p className="text-gray-600 mb-6">
                    {fetchError || 'This item cannot be claimed at this time.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/browse"
                      className="bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] font-medium transition-colors"
                    >
                      Browse Other Items
                    </Link>
                    <Link
                      href="/dashboard"
                      className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      View Your Dashboard
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Sign In to Claim This Item</h3>
              <p className="text-gray-600 mb-6">You need to be signed in to submit a claim request.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/auth/login"
                  className="bg-[#FF385C] text-white px-6 py-3 rounded-lg hover:bg-[#E31C5F] font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claim Modal */}
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