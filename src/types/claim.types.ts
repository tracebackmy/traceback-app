
export enum ClaimStatus {
  Submitted = 'claim-submitted',
  UnderReview = 'under-review-triage',
  VerificationChat = 'verification-chat',
  Approved = 'approved',
  Rejected = 'rejected'
}

export interface ClaimRequest {
  id: string;
  itemId: string;
  userId: string;
  status: 'claim-submitted' | 'under-review-triage' | 'verification-chat' | 'approved' | 'rejected';
  evidence: string[]; // URLs to evidence images
  verificationTicketId?: string;
  rejectionReason?: string;
  createdAt: number;
  updatedAt: number;
}
