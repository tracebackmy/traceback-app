'use client';

import Link from 'next/link';
import { useAdmin } from '@/components/AdminProvider';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import NotificationBell from './NotificationBell';
import NotificationDropdown from './NotificationDropdown';

export default function AdminNavbar() {
  const { admin, logout } = useAdmin();
  const pathname = usePathname();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const navigation = [
    { name: 'Dashboard', href: '/traceback-admin/dashboard' },
    { name: 'Inventory', href: '/traceback-admin/items' }, // Renamed for clarity
    { name: 'Tickets', href: '/traceback-admin/tickets' },
    { name: 'Claims', href: '/traceback-admin/claims' },
    { name: 'Users', href: '/traceback-admin/users' },
    { name: 'CCTV', href: '/traceback-admin/cctv' },
    { name: 'Analytics', href: '/traceback-admin/analytics' },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left Side: Logo & Desktop Nav */}
          <div className="flex items-center">
            <Link href="/traceback-admin/dashboard" className="flex items-center flex-shrink-0">
              <Image 
                src="/TRACEBACK.png" 
                alt="Traceback Logo" 
                width={32} 
                height={32} 
                className="mr-2"
              />
              <span className="text-lg font-bold text-[#FF385C] hidden md:block">
                Admin Panel
              </span>
            </Link>
            <div className="hidden md:ml-6 md:flex md:space-x-2 lg:space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-[#FF385C] text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Right Side: Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <NotificationBell onClick={toggleNotifications} />
              <NotificationDropdown 
                isOpen={isNotificationOpen} 
                onClose={() => setIsNotificationOpen(false)} 
              />
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-gray-900">
                {admin?.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-gray-500 uppercase">Administrator</span>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-2"></div>

            <Link 
              href="/"
              className="text-gray-500 hover:text-gray-900 text-sm font-medium"
              title="Go to Public Site"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 text-sm font-medium"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <div className="relative mr-2">
              <NotificationBell onClick={toggleNotifications} />
              <NotificationDropdown 
                isOpen={isNotificationOpen} 
                onClose={() => setIsNotificationOpen(false)} 
              />
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-500 hover:text-gray-900 p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.href)
                    ? 'bg-[#FF385C] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-4 border-t border-gray-200 px-4 flex justify-between items-center">
            <Link href="/" className="text-sm font-medium text-gray-600">View Public Site</Link>
            <button onClick={handleLogout} className="text-sm font-medium text-red-600">Logout</button>
          </div>
        </div>
      )}
    </nav>
  );
}