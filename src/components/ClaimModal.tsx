'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ClaimFormData, ItemClaimStatus } from '@/types/claim'; // FIX: Imported ItemClaimStatus
import { NotificationService } from '@/lib/notification-utils'; // Import NotificationService

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  onClaimSubmitted: () => void;
}

export default function ClaimModal({ 
  isOpen, 
  onClose, 
  itemId, 
  itemName, 
  onClaimSubmitted 
}: ClaimModalProps) {
  const { user, uid, email } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ClaimFormData>({
    itemId,
    claimReason: '',
    userPhone: '',
    proofDescription: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uid || !email) return;

    setLoading(true);
    try {
      // 1. Create claim request
      const claimData = {
        itemId,
        userId: uid,
        userEmail: email,
        userName: user.displayName || 'Unknown User',
        userPhone: formData.userPhone,
        claimReason: formData.claimReason,
        proofDescription: formData.proofDescription,
        status: 'claim-submitted' as ItemClaimStatus, // FIX: Use the new initial status
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const claimRef = await addDoc(collection(db, 'claims'), claimData);

      // 2. Update item claim status
      await updateDoc(doc(db, 'items', itemId), {
        claimStatus: 'claim-submitted' as ItemClaimStatus, // FIX: Use the new status
        currentClaimId: claimRef.id,
        updatedAt: Timestamp.now()
      });

      // 3. Notify Admin of New Claim 
      await NotificationService.createAdminClaimNotification(
        'tracebackfyp@gmail.com', 
        claimRef.id,
        user.displayName || 'User',
        itemName
      );
      
      // Reset form and close modal
      setFormData({
        itemId,
        claimReason: '',
        userPhone: '',
        proofDescription: ''
      });
      
      onClaimSubmitted();
      onClose();
    } catch (error) {
      console.error('Error submitting claim:', error);
      // NOTE: Replace alert() with a modal/toast notification in the final version
      alert('Failed to submit claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!isOpen) return null;

  // --- UI remains the same ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#FF385C] text-white p-4 rounded-t-lg">
          <h2 className="text-xl font-semibold">Claim Item</h2>
          <p className="text-sm opacity-90 mt-1">Claim: {itemName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Phone Number */}
          <div>
            <label htmlFor="userPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              id="userPhone"
              name="userPhone"
              value={formData.userPhone}
              onChange={handleChange}
              placeholder="Enter your phone number for contact"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
            />
          </div>

          {/* Claim Reason */}
          <div>
            <label htmlFor="claimReason" className="block text-sm font-medium text-gray-700 mb-1">
              Why do you believe this item belongs to you? *
            </label>
            <textarea
              id="claimReason"
              name="claimReason"
              value={formData.claimReason}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Please describe why you believe this is your item. Include specific details like unique features, when you lost it, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent resize-none"
            />
          </div>

          {/* Proof Description */}
          <div>
            <label htmlFor="proofDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Proof (Optional)
            </label>
            <textarea
              id="proofDescription"
              name="proofDescription"
              value={formData.proofDescription}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional information that can help verify your claim (e.g., purchase receipt details, distinctive marks, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent resize-none"
            />
          </div>

          {/* User Info Notice */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Your contact information (email {user?.email}) will be shared with our admin team to process your claim.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.claimReason.trim()}
              className="flex-1 bg-[#FF385C] text-white px-4 py-2 rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}