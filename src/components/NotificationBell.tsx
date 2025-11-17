'use client';

import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBellProps {
  onClick: () => void;
}

export default function NotificationBell({ onClick }: NotificationBellProps) {
  const { unreadCount, loading } = useNotifications();

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      aria-label="Notifications"
    >
      <svg 
        className="w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 17h5l-5 5v-5zM10.24 8.56a5.97 5.97 0 01-4.66-7.5 1 1 0 00-1.2-1.2 7.97 7.97 0 006.16 10.02 1 1 0 001.2-1.2 5.97 5.97 0 01-1.5-4.66zM15 12a3 3 0 11-6 0 3 3 0 016 0z" 
        />
      </svg>
      
      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#FF385C] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <span className="absolute -top-1 -right-1 bg-gray-400 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
          ...
        </span>
      )}
    </button>
  );
}