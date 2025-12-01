'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { safeDateConvert, isToday } from '@/lib/date-utils';
import { Notification } from '@/types/notification';
import { useRouter } from 'next/navigation';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // 1. Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // 2. Navigate based on type
    const { type, relatedId } = notification;
    
    if (relatedId) {
      switch (type) {
        case 'claim_update':
        case 'claim_approved':
        case 'claim_rejected':
          // Go to the Claim Page (which is nested under items)
          router.push(`/items/${notification.data?.itemName ? relatedId : notification.data?.claimId}/claim`);
          // Fallback to dashboard if structure differs
          // router.push('/auth/dashboard');
          break;
          
        case 'item_found':
          // Go to the item that was found
          router.push(`/items/${relatedId}`);
          break;

        case 'chat_message':
        case 'new_ticket':
          // Open the chat logic logic is handled by ChatBox component listening to tickets
          // For now, redirect to dashboard where tickets might be visible
          // or stay on page if ChatBox is global
          // Ideally: router.push('/auth/dashboard?ticketId=' + relatedId);
          router.push('/auth/dashboard');
          break;
          
        case 'admin_approval':
          router.push(`/traceback-admin/claims/${relatedId}`);
          break;

        default:
          break;
      }
    }
    
    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'claim_approved':
        return '✅';
      case 'claim_rejected':
        return '❌';
      case 'claim_update':
        return '📝';
      case 'chat_message':
      case 'new_ticket':
        return '💬';
      case 'item_found':
        return '🔍';
      case 'system_alert':
        return '⚠️';
      case 'admin_approval':
        return '👤';
      default:
        return '🔔';
    }
  };

  const formatNotificationTime = (timestamp: any): string => {
    const date = safeDateConvert(timestamp);
    
    if (isToday(date)) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="text-xs text-[#FF385C] hover:text-[#E31C5F] disabled:opacity-50 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.slice(0, 10).map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                  !notification.read ? 'bg-blue-50/50' : ''
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {formatNotificationTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-[#FF385C] rounded-full flex-shrink-0 mt-1.5"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}