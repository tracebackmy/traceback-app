
export type TicketType = 'support' | 'item_match' | 'claim_verification';
export type TicketStatus = 'open' | 'in-progress' | 'resolved';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  attachmentUrl?: string;
  timestamp: number;
  read: boolean;
  isAdmin: boolean;
}

export interface Ticket {
  id: string;
  userId: string;
  adminId?: string;
  type: TicketType;
  title: string;
  description: string;
  relatedItemId?: string;
  relatedClaimId?: string;
  status: TicketStatus;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
