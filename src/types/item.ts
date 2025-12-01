import { Timestamp } from 'firebase/firestore';
import { ItemClaimStatus } from './claim';

export interface Item {
  id: string;
  userId: string;
  type: 'lost' | 'found';
  title: string;
  category: string;
  description: string;
  mode: string;
  line: string;
  stationId: string;
  contactPreference: 'email' | 'phone';
  // 'resolved' means Admin found it or User found it elsewhere.
  // 'claimed' means it was matched to a 'found' item via a claim request.
  status: 'open' | 'closed' | 'resolved' | 'claimed'; 
  claimStatus: ItemClaimStatus;
  currentClaimId?: string;
  imageUrls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userEmail?: string;
  userName?: string;
}