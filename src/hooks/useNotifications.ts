import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification } from '@/types/notification';
import { getNotificationsQuery, getUnreadNotificationsQuery, NotificationService } from '@/lib/notification-utils';

export const useNotifications = () => {
  const { user } = useAuth();
  const { admin } = useAdmin();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Determine current user ID (regular user or admin)
  const currentUserId = user?.uid || admin?.uid;

  useEffect(() => {
    if (!currentUserId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to notifications for current user
    const notificationsQuery = getNotificationsQuery(currentUserId);
    
    const unsubscribe = onSnapshot(notificationsQuery, 
      (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
        
        setNotifications(notificationsData);
        
        // Calculate unread count
        const unread = notificationsData.filter(notification => !notification.read).length;
        setUnreadCount(unread);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notification => !notification.read);
      
      // Update each unread notification
      const updatePromises = unreadNotifications.map(notification => 
        markAsRead(notification.id)
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    hasNotifications: notifications.length > 0,
    hasUnread: unreadCount > 0
  };
};