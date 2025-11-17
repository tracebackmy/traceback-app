import { Timestamp } from 'firebase/firestore';

export interface ClaimRequest {
  id: string;
  itemId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  claimReason: string;
  proofDescription?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  // Link to item data for easier queries
  itemName?: string;
  itemCategory?: string;
  itemStation?: string;
  itemImageUrls?: string[];
}

export interface ClaimFormData {
  itemId: string;
  claimReason: string;
  userPhone?: string;
  proofDescription?: string;
}

// Add claim status to items
export type ItemClaimStatus = 'unclaimed' | 'claim-pending' | 'claimed' | 'under-review';