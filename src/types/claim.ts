import { Timestamp } from 'firebase/firestore';

// Expanded Claim Statuses for Triage Flow
export type ItemClaimStatus = 
  | 'unclaimed' 
  | 'claim-submitted'     // New initial state
  | 'verification-chat'   // New state: Admin requests chat proof
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface ClaimRequest {
  id: string;
  itemId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  claimReason: string;
  proofDescription?: string;
  status: ItemClaimStatus; // Use the new comprehensive status
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  
  // New link to chat/ticket for verification
  verificationTicketId?: string; 
  
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