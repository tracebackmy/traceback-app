import { Timestamp } from 'firebase/firestore';

export interface MailDocument {
  to: string | string[]; // Single email or array of emails
  cc?: string | string[];
  bcc?: string | string[];
  message: {
    subject: string;
    text?: string;
    html?: string; // We will primarily use this for formatted notifications
  };
  delivery?: {
    attempts: number;
    state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';
    error?: string;
    startTime?: Timestamp;
    endTime?: Timestamp;
  };
  createdAt: Timestamp | Date;
  // Optional metadata to track why this email was sent
  metadata?: {
    triggerType: 'item_found' | 'claim_update' | 'ticket_reply';
    relatedId: string;
  };
}