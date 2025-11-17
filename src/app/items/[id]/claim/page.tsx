// src/app/items/[id]/claim/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import ClaimModal from '@/components/ClaimModal';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  category: string;
  description: string;
  type: 'lost' | 'found';
  status: string;
  userId: string;
  images?: string[];
  createdAt: unknown;
}

export default function ClaimItemPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const itemId = params.id as string;
  
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const fetchItem = async () => {
    try {
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (itemDoc.exists()) {
        setItem({
          id: itemDoc.id,
          ...itemDoc.data()
        } as Item);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSubmitted = () => {
    setClaimSuccess(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 3000);
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
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Item Not Found</h1>
          <p className="text-gray-600 mb-4">The item you are looking for does not exist.</p>
          <Link href="/browse" className="bg-[#FF385C] text-white px-6 py-2 rounded-lg hover:bg-[#E31C5F]">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  if (claimSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Submitted Successfully!</h1>
            <p className="text-gray-600 mb-6">
              Your claim for &apos;{item.name}&apos; has been submitted. Our admin team will review your request and contact you soon.
            </p>
            <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
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
            className="inline-flex items-center text-[#FF385C] hover:text-[#E31C5F] mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Item
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Claim This Item</h1>
          <p className="text-gray-600 mt-2">Submit a claim request for the item below</p>
        </div>

        {/* Item Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Item Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Image */}
            <div>
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
            </div>

            {/* Item Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <p className="text-gray-600 mt-1">{item.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{item.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.type}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    item.status === 'open' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'claimed' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reported</p>
                  <p className="font-medium">{formatDate(item.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Before You Claim</h3>
          <ul className="text-blue-800 space-y-2">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Provide specific details about the item to help verify your claim
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Include any unique features, purchase details, or identifying marks
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Our admin team will review your claim and contact you for verification
            </li>
          </ul>
        </div>

        {/* Claim Button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          {user ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Claim This Item?</h3>
              <button
                onClick={() => setShowClaimModal(true)}
                className="bg-[#FF385C] text-white px-8 py-3 rounded-lg hover:bg-[#E31C5F] font-medium transition-colors"
              >
                Start Claim Process
              </button>
              <p className="text-sm text-gray-500 mt-3">
                You will be asked to provide details to verify your ownership
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign In to Claim This Item</h3>
              <p className="text-gray-600 mb-4">You need to be signed in to submit a claim.</p>
              <Link
                href="/auth/login"
                className="bg-[#FF385C] text-white px-8 py-3 rounded-lg hover:bg-[#E31C5F] font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <ClaimModal
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          itemId={item.id}
          itemName={item.name}
          onClaimSubmitted={handleClaimSubmitted}
        />
      )}
    </div>
  );
}