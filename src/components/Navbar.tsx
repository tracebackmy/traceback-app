'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import NotificationBell from './NotificationBell'
import NotificationDropdown from './NotificationDropdown'

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  // ⭐⭐⭐ CRITICAL FIX: Hide user navbar on admin routes ⭐⭐⭐
  if (pathname.startsWith('/traceback-admin')) {
    return null
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen)
  }

  console.log('🔍 Navbar Debug:', { 
    user: user?.email, 
    pathname,
    showAdminButton: !user 
  });

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image 
                src="/TRACEBACK.png" 
                alt="Traceback Logo" 
                width={40} 
                height={40} 
                className="mr-3"
              />
              <span className="text-xl font-bold text-[#FF385C]">
                Traceback
              </span>
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              <Link href="/browse" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Browse
              </Link>
              {user && (
                <Link href="/report" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Report
                </Link>
              )}
              {/* ⭐⭐⭐ ADMIN BUTTON: Only show when user is NOT logged in ⭐⭐⭐ */}
              {!user && (
                <Link 
                  href="/traceback-admin/login" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  onClick={() => console.log('🔄 Admin button clicked')}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative">
                  <NotificationBell onClick={toggleNotifications} />
                  <NotificationDropdown 
                    isOpen={isNotificationOpen} 
                    onClose={() => setIsNotificationOpen(false)} 
                  />
                </div>
                
                <Link href="/profile" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link href="/auth/register" className="bg-[#FF385C] text-white hover:bg-[#E31C5F] px-4 py-2 rounded-md text-sm font-medium">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}