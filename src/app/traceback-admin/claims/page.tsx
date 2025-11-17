// src/app/traceback-admin/claims/page.tsx
'use client';

import { useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  Timestamp, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/components/AdminProvider';
import Link from 'next/link';
import { ClaimRequest } from '@/types/claim';

interface Item {
  id: string;
  title: string;
  type: 'lost' | 'found';
  category: string;
  stationId: string;
  mode: string;
  imageUrls?: string[];
}

interface ClaimWithItem extends ClaimRequest {
  item?: Item;
}

export default function AdminClaimsPage() {
  const { admin } = useAdmin();
  const [claims, setClaims] = useState<ClaimWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        let claimsQuery;
        
        if (filter === 'all') {
          claimsQuery = query(collection(db, 'claims'), orderBy('createdAt', 'desc'));
        } else {
          claimsQuery = query(
            collection(db, 'claims'), 
            where('status', '==', filter),
            orderBy('createdAt', 'desc')
          );
        }

        const unsubscribe = onSnapshot(claimsQuery, async (snapshot) => {
          const claimsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ClaimRequest[];

          // Fetch item details for each claim
          const claimsWithItems = await Promise.all(
            claimsData.map(async (claim) => {
              try {
                // Use getDoc instead of query for single document
                const itemDoc = await getDocs(
                  query(collection(db, 'items'), where('__name__', '==', claim.itemId))
                );
                if (!itemDoc.empty) {
                  const itemData = {
                    id: itemDoc.docs[0].id,
                    ...itemDoc.docs[0].data()
                  } as Item;
                  return { ...claim, item: itemData } as ClaimWithItem;
                }
              } catch (error) {
                console.error('Error fetching item for claim:', error);
              }
              return claim as ClaimWithItem;
            })
          );

          setClaims(claimsWithItems);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching claims:', error);
        setLoading(false);
      }
    };

    fetchClaims();
  }, [filter]);

  const updateClaimStatus = async (claimId: string, status: ClaimRequest['status'], reason?: string) => {
    if (!admin) return;

    setUpdating(true);
    try {
      const claimRef = doc(db, 'claims', claimId);
      const updateData: Record<string, any> = {
        status,
        updatedAt: Timestamp.now(),
        reviewedBy: admin.email
      };

      if (status === 'rejected' && reason) {
        updateData.rejectionReason = reason;
        updateData.reviewedAt = Timestamp.now();
      } else if (status === 'approved') {
        updateData.reviewedAt = Timestamp.now();
      }

      // Update claim document
      await updateDoc(claimRef, updateData);

      // Update the associated item's status
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        const itemRef = doc(db, 'items', claim.itemId);
        const itemUpdate: Record<string, any> = {
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
      }

      setSelectedClaim(null);
      setRejectionReason('');
      alert(`Claim ${status} successfully!`);
    } catch (error) {
      console.error('Error updating claim status:', error);
      alert('Failed to update claim status');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (timestamp: unknown): ReactNode => {
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusCount = (status: string) => {
    return claims.filter(claim => claim.status === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Claim Requests</h1>
          <p className="text-gray-600 mt-2">Manage and review item claim requests from users</p>
        </div>

        {/* Stats Cards - Enhanced with better data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📋</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Claims</p>
                <p className="text-2xl font-semibold text-gray-900">{claims.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-2xl font-semibold text-gray-900">{getStatusCount('pending')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">{getStatusCount('approved')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">❌</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="text-2xl font-semibold text-gray-900">{getStatusCount('rejected')}</p>
              </div>
            </div>
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
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending' 
                  ? 'bg-yellow-500 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({getStatusCount('pending')})
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
                    Item & Claim Details
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
                        <p className="text-sm mt-1">
                          {filter !== 'all' 
                            ? `No ${filter} claims at the moment` 
                            : 'No claims have been submitted yet'
                          }
                        </p>
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
                              <img
                                src={claim.item.imageUrls[0]}
                                alt={claim.item.title}
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
                                  {claim.item.category} • {claim.item.stationId}
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
                          {claim.userPhone && (
                            <p className="text-sm text-gray-500 truncate" title={claim.userPhone}>
                              {claim.userPhone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(claim.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className="text-blue-600 hover:text-blue-900 text-left transition-colors"
                          >
                            Review Details
                          </button>
                          {claim.status === 'pending' && (
                            <div className="flex space-x-3">
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to approve this claim?')) {
                                    updateClaimStatus(claim.id, 'approved');
                                  }
                                }}
                                disabled={updating}
                                className="text-green-600 hover:text-green-900 transition-colors disabled:opacity-50"
                              >
                                {updating ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => setSelectedClaim(claim)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          <Link 
                            href={`/traceback-admin/claims/${claim.id}`}
                            className="text-[#FF385C] hover:text-[#E31C5F] transition-colors"
                          >
                            Full Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Modal - Enhanced with better UX */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-[#FF385C] text-white p-4 rounded-t-lg sticky top-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">Review Claim</h2>
                    <p className="text-sm opacity-90 mt-1">
                      {selectedClaim.item?.title || `Item: ${selectedClaim.itemId}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClaim(null);
                      setRejectionReason('');
                    }}
                    className="text-white hover:text-gray-200 text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Claim Status */}
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Current Status:</span>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedClaim.status)}`}>
                    {selectedClaim.status.charAt(0).toUpperCase() + selectedClaim.status.slice(1)}
                  </span>
                </div>

                {/* User Information */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Claimant Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Name</label>
                        <p className="text-gray-900">{selectedClaim.userName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{selectedClaim.userEmail}</p>
                      </div>
                      {selectedClaim.userPhone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-gray-900">{selectedClaim.userPhone}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Submitted</label>
                        <p className="text-gray-900">{formatDate(selectedClaim.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item Information */}
                {selectedClaim.item && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Item Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Title</label>
                          <p className="text-gray-900">{selectedClaim.item.title}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Category</label>
                          <p className="text-gray-900">{selectedClaim.item.category}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Station</label>
                          <p className="text-gray-900">{selectedClaim.item.stationId}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Type</label>
                          <p className="text-gray-900 capitalize">{selectedClaim.item.type}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Claim Reason */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Claim Reason</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {selectedClaim.claimReason}
                    </p>
                  </div>
                </div>

                {/* Proof Description */}
                {selectedClaim.proofDescription && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Additional Proof</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {selectedClaim.proofDescription}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason Input */}
                {selectedClaim.status === 'pending' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Rejection Reason</h3>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide a reason for rejection (this will be shared with the user)..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent resize-none"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      This reason will be visible to the user if the claim is rejected.
                    </p>
                  </div>
                )}

                {/* Rejection History */}
                {selectedClaim.status === 'rejected' && selectedClaim.rejectionReason && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Rejection Details</h3>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-red-800 whitespace-pre-wrap leading-relaxed">
                        {selectedClaim.rejectionReason}
                      </p>
                      {selectedClaim.reviewedAt && (
                        <p className="text-red-600 text-sm mt-3 font-medium">
                          Rejected on: {formatDate(selectedClaim.reviewedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedClaim(null);
                      setRejectionReason('');
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Close
                  </button>
                  
                  {selectedClaim.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to approve this claim? The item will be marked as claimed.')) {
                            updateClaimStatus(selectedClaim.id, 'approved');
                          }
                        }}
                        disabled={updating}
                        className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? 'Approving...' : 'Approve Claim'}
                      </button>
                      <button
                        onClick={() => {
                          if (rejectionReason.trim() || confirm('Reject this claim without providing a reason?')) {
                            updateClaimStatus(selectedClaim.id, 'rejected', rejectionReason.trim());
                          }
                        }}
                        disabled={updating}
                        className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? 'Rejecting...' : 'Reject Claim'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}