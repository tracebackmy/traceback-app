// src/types/claim.ts
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
  createdAt: unknown;
  updatedAt: unknown;
  reviewedBy?: string;
  reviewedAt?: unknown;
  rejectionReason?: string;
}

export interface ClaimFormData {
  itemId: string;
  claimReason: string;
  userPhone?: string;
  proofDescription?: string;
}