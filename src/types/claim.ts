import { Timestamp } from 'firebase/firestore';

// Finalized Statuses for Claim Triage
export type ItemClaimStatus = 
  | 'unclaimed' 
  | 'claim-submitted'     // Initial state when user submits
  | 'verification-chat'   // Admin requests chat
  | 'approved'            // Admin approves
  | 'rejected'            // Admin rejects
  | 'cancelled';          // User cancels

export interface ClaimRequest {
  id: string;
  itemId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  claimReason: string;
  proofDescription?: string;
  status: ItemClaimStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  // Denormalized Item Data for display
  itemName?: string;
  itemCategory?: string;
  itemStation?: string;
  itemImageUrls?: string[];
  verificationTicketId?: string;
}

export interface ClaimFormData {
  itemId: string;
  claimReason: string;
  userPhone?: string;
  proofDescription?: string;
}