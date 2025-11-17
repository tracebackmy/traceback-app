// src/types/chat.ts
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
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  lastMessage?: string;
}