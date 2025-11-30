export type ItemType = 'lost' | 'found';

export enum ItemStatus {
  Reported = 'reported',
  PendingVerification = 'pending_verification',
  Listed = 'listed',
  MatchFound = 'match_found',
  Resolved = 'resolved',
  Closed = 'closed'
}

export enum TransitMode {
  MRT = 'MRT',
  LRT = 'LRT',
  KTM = 'KTM'
}

export enum ItemCategory {
  Electronics = 'Electronics',
  Clothing = 'Clothing',
  PersonalAccessories = 'Personal Accessories',
  Documents = 'Documents',
  Bags = 'Bags',
  Other = 'Other'
}

export interface Item {
  id: string;
  userId: string;
  itemType: ItemType;
  title: string;
  description: string;
  category: string;
  stationId?: string; // Made optional to handle legacy data
  mode?: 'MRT' | 'LRT' | 'KTM'; // Made optional
  line?: string; // Made optional
  keywords: string[];
  status: ItemStatus | string; // Allow string fallback for raw firestore data
  imageUrls: string[];
  aiMatchScore?: number;
  createdAt: number;
  updatedAt: number;
}