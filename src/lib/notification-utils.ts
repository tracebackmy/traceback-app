import { collection, addDoc, Timestamp, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Notification, NotificationType } from '@/types/notification';

export class NotificationService {
  // Create a new notification
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
    try {
      const notificationData = {
        ...notification,
        createdAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string) {
    try {
      // Note: In a real app, use a batch write. For simplicity here:
      // This function is usually called from a hook that iterates the local list
      console.log('Batch mark read not implemented in utility to save reads');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Create specific notification types
  static async createClaimUpdateNotification(
    userId: string, 
    claimId: string, 
    status: 'approved' | 'rejected',
    itemName?: string,
    adminName?: string
  ) {
    const title = status === 'approved' ? 'Claim Approved' : 'Claim Rejected';
    const message = status === 'approved' 
      ? `Your claim for "${itemName || 'the item'}" has been approved!`
      : `Your claim for "${itemName || 'the item'}" was rejected.`;

    return this.createNotification({
      userId,
      type: status === 'approved' ? 'claim_approved' : 'claim_rejected',
      title,
      message,
      relatedId: claimId,
      read: false,
      data: {
        itemName,
        claimId,
        adminName,
        status
      }
    });
  }

  static async createChatMessageNotification(
    userId: string,
    ticketId: string,
    messagePreview: string
  ) {
    return this.createNotification({
      userId,
      type: 'chat_message',
      title: 'New Message',
      message: `New support message: ${messagePreview.substring(0, 50)}...`,
      relatedId: ticketId,
      read: false,
      data: {
        ticketId
      }
    });
  }

  static async createItemFoundNotification(
    userId: string,
    itemId: string,
    itemName: string
  ) {
    return this.createNotification({
      userId,
      type: 'item_found',
      title: 'Potential Match Found',
      message: `We found a "${itemName}" that matches your lost item description.`,
      relatedId: itemId,
      read: false,
      data: {
        itemName
      }
    });
  }

  // NEW: Notify user when Admin updates item status (e.g., marks as Found/Resolved)
  static async createItemStatusUpdateNotification(
    userId: string,
    itemId: string,
    itemName: string,
    newStatus: string
  ) {
    return this.createNotification({
      userId,
      type: 'item_found', // Reusing this type as it fits the UI icon
      title: 'Item Update',
      message: `Good news! Your item "${itemName}" has been marked as ${newStatus}. Check your dashboard for details.`,
      relatedId: itemId,
      read: false,
      data: {
        itemName,
        status: newStatus
      }
    });
  }

  static async createNewTicketNotification(
    userId: string,
    ticketId: string
  ) {
    return this.createNotification({
      userId,
      type: 'new_ticket',
      title: 'Support Ticket Created',
      message: 'Your support ticket has been created and will be reviewed soon.',
      relatedId: ticketId,
      read: false,
      data: {
        ticketId
      }
    });
  }

  static async createAdminClaimNotification(
    adminId: string,
    claimId: string,
    userName: string,
    itemName: string
  ) {
    return this.createNotification({
      userId: adminId,
      type: 'admin_approval',
      title: 'New Claim Request',
      message: `${userName} has submitted a claim for "${itemName}"`,
      relatedId: claimId,
      read: false,
      data: {
        claimId,
        userName, // Now valid
        itemName
      }
    });
  }
}

// Query helpers
export const getNotificationsQuery = (userId: string) => {
  return query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
};

export const getUnreadNotificationsQuery = (userId: string) => {
  return query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false),
    orderBy('createdAt', 'desc')
  );
};