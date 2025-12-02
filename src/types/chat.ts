import { Timestamp } from 'firebase/firestore';

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

// New Types for Context Awareness
export type TicketContextType = 'general' | 'lost_report' | 'claim_inquiry';

export interface TicketContextData {
  itemTitle?: string;
  itemImage?: string; // URL of the first image for quick reference
  claimStatus?: string;
  stationName?: string; // Useful for admins to know location immediately
}

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description?: string;
  status: 'open' | 'closed' | 'in-progress';
  priority: 'low' | 'medium' | 'high';
  assignedAdmin?: string;
  
  // New Context Fields
  contextType?: TicketContextType; 
  relatedId?: string; // ID of the Item or the Claim document
  contextData?: TicketContextData; // Snapshot data for UI headers

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  lastMessage?: string;
}