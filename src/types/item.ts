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
  status: 'open' | 'closed' | 'resolved' | 'claimed'; // Add 'claimed' here
  claimStatus: ItemClaimStatus;
  currentClaimId?: string;
  imageUrls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userEmail?: string;
  userName?: string;
}