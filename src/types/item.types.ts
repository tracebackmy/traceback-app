
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
  category: string; // Keeping as string to allow flexibility, but UI uses ItemCategory values
  stationId: string;
  mode: 'MRT' | 'LRT' | 'KTM'; // keeping string literal union to match existing usages easier
  line: string;
  keywords: string[];
  status: 'pending_verification' | 'listed' | 'reported' | 'match_found' | 'resolved' | 'closed'; // String literals for backward compat
  imageUrls: string[];
  aiMatchScore?: number;
  createdAt: number;
  updatedAt: number;
}
