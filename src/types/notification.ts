import { Timestamp } from 'firebase/firestore';

export type NotificationType = 
  | 'claim_update'
  | 'chat_message'
  | 'item_found'
  | 'system_alert'
  | 'admin_approval'
  | 'claim_approved'
  | 'claim_rejected'
  | 'new_ticket'
  | 'ticket_update';

export interface Notification {
  id: string;
  userId: string; // Target user ID
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string; // itemId, claimId, ticketId, etc.
  read: boolean;
  createdAt: Timestamp;
  data?: {
    // Additional context data
    itemName?: string;
    claimId?: string;
    ticketId?: string;
    adminName?: string;
    status?: string;
    userName?: string; // Added to fix the type error
  };
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  types: {
    claim_updates: boolean;
    chat_messages: boolean;
    item_matches: boolean;
    system_alerts: boolean;
  };
}