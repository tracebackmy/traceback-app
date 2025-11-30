import { Timestamp } from 'firebase/firestore';
import { ItemClaimStatus } from './claim';

export type ItemType = 'lost' | 'found';

// Finalized Statuses for Phase 2
export type ItemStatus = 
  | 'pending_verification' // Admin found item, waiting for approval
  | 'listed'               // Found item, visible on /browse
  | 'reported'             // Lost item, visible only to user/admin
  | 'match_found'          // Lost item, potential match flagged
  | 'resolved'             // Successfully returned
  | 'closed';              // Manually closed

export interface Item {
  id: string;
  userId: string;
  type: ItemType;
  title: string;
  category: string;
  description: string;
  mode: string;
  line: string;
  stationId: string;
  contactPreference: 'email' | 'phone';
  status: ItemStatus;
  claimStatus: ItemClaimStatus;
  currentClaimId?: string;
  imageUrls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userEmail?: string;
  userName?: string;
  keywords?: string[];
}