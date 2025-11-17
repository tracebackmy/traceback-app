'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import { ClaimRequest } from '@/types/claim';
import Link from 'next/link';

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAdmin();
  const [claim, setClaim] = useState<ClaimRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const claimId = params.id as string;

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const claimDoc = await getDoc(doc(db, 'claims', claimId));
        if (claimDoc.exists()) {
          setClaim({ id: claimDoc.id, ...claimDoc.data() } as ClaimRequest);
        } else {
          router.push('/traceback-admin/claims');
        }
      } catch (error) {
        console.error('Error fetching claim:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClaim();
  }, [claimId, router]);

  const updateClaimStatus = async (status: ClaimRequest['status'], rejectionReason?: string) => {
    if (!admin || !claim) return;

    setUpdating(true);
    try {
      const claimRef = doc(db, 'claims', claim.id);
      const updateData: any = {
        status,
        reviewedAt: Timestamp.now(),
        reviewedBy: admin.email,
        updatedAt: Timestamp.now()
      };

      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      await updateDoc(claimRef, updateData);

      // Update the associated item
      const itemRef = doc(db, 'items', claim.itemId);
      const itemUpdate: any = {
        updatedAt: Timestamp.now()
      };

      if (status === 'approved') {
        itemUpdate.claimStatus = 'claimed';
        itemUpdate.status = 'closed';
      } else if (status === 'rejected') {
        itemUpdate.claimStatus = 'unclaimed';
        itemUpdate.currentClaimId = null;
      }

      await updateDoc(itemRef, itemUpdate);

      // Refresh claim data
      const updatedClaimDoc = await getDoc(claimRef);
      setClaim({ id: updatedClaimDoc.id, ...updatedClaimDoc.data() } as ClaimRequest);

      alert(`Claim ${status} successfully!`);
    } catch (error) {
      console.error('Error updating claim:', error);
      alert('Error updating claim');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid Date';
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/traceback-admin/claims"
          className="inline-flex items-center text-[#FF385C] hover:text-[#E31C5F] mb-6"
        >
          ← Back to Claims
        </Link>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#FF385C] text-white p-6">
            <h1 className="text-2xl font-bold">Claim Details</h1>
            <p className="opacity-90">Claim ID: {claim.id}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Claim Status */}
            <div className="flex justify-between items-center">
              <div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                  claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  Status: {claim.status.toUpperCase()}
                </span>
              </div>
              {claim.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (confirm('Approve this claim?')) {
                        updateClaimStatus('approved');
                      }
                    }}
                    disabled={updating}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {updating ? 'Approving...' : 'Approve Claim'}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) {
                        updateClaimStatus('rejected', reason);
                      }
                    }}
                    disabled={updating}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {updating ? 'Rejecting...' : 'Reject Claim'}
                  </button>
                </div>
              )}
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

            {/* Claim Details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item ID</label>
                  <p className="mt-1 text-sm text-gray-900">{claim.itemId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Claim Reason</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{claim.claimReason}</p>
                </div>
                {claim.proofDescription && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Proof</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{claim.proofDescription}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timestamps</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(claim.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(claim.updatedAt)}</p>
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

            {/* Rejection Reason (if rejected) */}
            {claim.status === 'rejected' && claim.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
                <p className="mt-1 text-sm text-red-700">{claim.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}