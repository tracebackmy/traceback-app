import { Timestamp } from 'firebase/firestore';
import { ItemClaimStatus } from './claim';

export type ItemType = 'lost' | 'found';
// Expanded statuses for Item Lifecycle
export type ItemStatus = 
  | 'pending_verification' // NEW: Admin found item, waiting for approval/listing
  | 'listed'               // NEW: Found item, visible on /browse
  | 'reported'             // NEW: Lost item, visible only to user/admin
  | 'match_found'          // NEW: Lost item, potential match flagged
  | 'resolved'             // Successfully returned/closed
  | 'closed';              // Manually closed

export interface Item {
  id: string;
  userId: string; // User who reported or Admin/Staff ID
  type: ItemType;
  title: string;
  category: string;
  description: string;
  mode: string;
  line: string;
  stationId: string;
  contactPreference: 'email' | 'phone';
  status: ItemStatus; // Use the new comprehensive status
  claimStatus: ItemClaimStatus;
  currentClaimId?: string;
  imageUrls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userEmail?: string;
  userName?: string;
  
  // New field for matching utility
  keywords?: string[]; // Used by matching-utils.ts
}