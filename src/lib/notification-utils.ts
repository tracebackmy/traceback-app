import { collection, addDoc, Timestamp, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Notification } from '@/types/notification';
import { MailDocument } from '@/types/mail';

export class NotificationService {
  // Create a new notification (In-App)
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

  // --- NEW: Send Email via Firebase Extension ---
  static async sendEmail(to: string, subject: string, htmlContent: string, relatedId?: string) {
    try {
      const mailData: Omit<MailDocument, 'delivery'> = {
        to,
        message: {
          subject,
          html: htmlContent,
        },
        createdAt: Timestamp.now(),
        metadata: {
          triggerType: 'item_found', // Default, can be parameterized if needed
          relatedId: relatedId || ''
        }
      };

      // Add to 'mail' collection -> Triggers Extension
      await addDoc(collection(db, 'mail'), mailData);
      console.log(`Email request queued for ${to}`);
    } catch (error) {
      console.error('Error queuing email:', error);
      // We don't throw here to prevent blocking the main UI flow if email fails
    }
  }

  // Email Template Helpers
  static getResolvedEmailTemplate(userName: string, itemName: string, stationName: string) {
    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF385C;">Good News from Traceback!</h1>
        <p>Dear ${userName},</p>
        <p>We are pleased to inform you that your item <strong>"${itemName}"</strong> has been successfully matched and is ready for collection.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Item:</strong> ${itemName}</p>
          <p><strong>Location:</strong> ${stationName}</p>
          <p><strong>Status:</strong> Ready for Collection / Resolved</p>
        </div>

        <p>Please visit the station management office with your ID to collect your item.</p>
        <p>If you have any questions, you can reply to the support ticket in your dashboard.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #888;">Traceback - Lost & Found Management System</p>
      </div>
    `;
  }
  // ------------------------------------------------

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
      // Note: In a real app, use a batch write.
      console.log('Batch mark read logic placeholder');
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

  static async createItemStatusUpdateNotification(
    userId: string,
    itemId: string,
    itemName: string,
    newStatus: string
  ) {
    return this.createNotification({
      userId,
      type: 'item_found', 
      title: 'Item Update',
      message: `Good news! Your item "${itemName}" has been marked as ${newStatus}.`,
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
        userName, 
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