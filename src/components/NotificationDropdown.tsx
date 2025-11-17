'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { safeDateConvert, isToday } from '@/lib/date-utils';
import { Notification } from '@/types/notification';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // TODO: Handle navigation based on notification type
    // For now, just close the dropdown
    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'claim_approved':
      case 'claim_update':
        return '✅';
      case 'claim_rejected':
        return '❌';
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
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="text-sm text-[#FF385C] hover:text-[#E31C5F] disabled:opacity-50"
            >
              {isMarkingAll ? 'Marking...' : 'Mark all as read'}
            </button>
          )}
        </div>
        {unreadCount > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No notifications yet</p>
            <p className="text-sm mt-1">We'll notify you when something important happens</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.slice(0, 10).map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-lg flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      !notification.read ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatNotificationTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-[#FF385C] rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button className="w-full text-center text-sm text-[#FF385C] hover:text-[#E31C5F] font-medium">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}