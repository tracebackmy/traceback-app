import { Timestamp } from 'firebase/firestore';

// NEW: Ticket Type for different purposes
export type TicketType = 'support' | 'item_match' | 'claim_verification';

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: Timestamp | Date;
  isAdmin: boolean;
  ticketId: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  read: boolean;
}

export interface TypingIndicator {
  ticketId: string;
  userId: string;
  userType: 'user' | 'admin';
  isTyping: boolean;
  timestamp: Timestamp | Date;
}

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description?: string;
  status: 'open' | 'closed' | 'in-progress' | 'resolved'; // Added 'resolved' for clarity
  priority: 'low' | 'medium' | 'high';
  assignedAdmin?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  lastMessage?: string;
  
  // CRITICAL: New Fields for Flow Integration
  type: TicketType; 
  relatedItemId?: string; // Links to the relevant Item ID (for Lost/Found Match or Claim)
  relatedClaimId?: string; // Links to the Claim ID (if type is 'claim_verification')
}