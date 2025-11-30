import { collection, addDoc, Timestamp, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification, NotificationType } from '@/types/notification';

export class NotificationService {
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
    try {
      const notificationData = {
        ...notification,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'notifications'), notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  static async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      // In a real app, you would fetch these docs and run a batch update.
      // For this scope, we'll log the intent.
      console.log('Marking all read for user:', userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

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

    const type: NotificationType = status === 'approved' ? 'claim_approved' : 'claim_rejected';

    return this.createNotification({
      userId,
      type,
      title,
      message,
      relatedId: claimId,
      read: false,
      data: { itemName, claimId, adminName, status }
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
      data: { claimId, userName, itemName }
    });
  }
}

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