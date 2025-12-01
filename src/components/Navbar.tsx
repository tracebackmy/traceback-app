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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Hide user navbar on admin routes
  if (pathname.startsWith('/traceback-admin')) {
    return null
  }

  const handleLogout = async () => {
    try {
      await logout()
      setIsMobileMenuOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen)
  }

  // Helper to check active state
  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Nav */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image 
                src="/TRACEBACK.png" 
                alt="Traceback Logo" 
                width={35} 
                height={35} 
                className="mr-2"
              />
              <span className="text-xl font-bold text-[#FF385C] hidden sm:block">
                Traceback
              </span>
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              <NavLink href="/" active={isActive('/')}>
                Home
              </NavLink>
              <NavLink href="/browse" active={isActive('/browse')}>
                Browse Found
              </NavLink>
              {user && (
                <NavLink href="/report" active={isActive('/report')}>
                  Report Lost
                </NavLink>
              )}
              {user && (
                 <NavLink href="/auth/dashboard" active={isActive('/auth/dashboard')}>
                  Dashboard
                </NavLink>
              )}
            </div>
          </div>

          {/* Right Side Actions (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <div className="relative">
                  <NotificationBell onClick={toggleNotifications} />
                  <NotificationDropdown 
                    isOpen={isNotificationOpen} 
                    onClose={() => setIsNotificationOpen(false)} 
                  />
                </div>
                
                <Link href="/profile" className={`text-sm font-medium ${isActive('/profile') ? 'text-[#FF385C]' : 'text-gray-600 hover:text-gray-900'}`}>
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Log in
                </Link>
                <Link href="/auth/register" className="bg-[#FF385C] text-white hover:bg-[#E31C5F] px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-transform hover:scale-105">
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            {user && (
               <div className="relative mr-4">
                <NotificationBell onClick={toggleNotifications} />
                <NotificationDropdown 
                  isOpen={isNotificationOpen} 
                  onClose={() => setIsNotificationOpen(false)} 
                />
              </div>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-500 hover:text-gray-900 focus:outline-none p-2"
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

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-in slide-in-from-top-5 duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <MobileNavLink href="/" onClick={() => setIsMobileMenuOpen(false)} active={isActive('/')}>
              Home
            </MobileNavLink>
            <MobileNavLink href="/browse" onClick={() => setIsMobileMenuOpen(false)} active={isActive('/browse')}>
              Browse Found Items
            </MobileNavLink>
            {user && (
              <>
                <MobileNavLink href="/report" onClick={() => setIsMobileMenuOpen(false)} active={isActive('/report')}>
                  Report Lost Item
                </MobileNavLink>
                <MobileNavLink href="/auth/dashboard" onClick={() => setIsMobileMenuOpen(false)} active={isActive('/auth/dashboard')}>
                  Dashboard
                </MobileNavLink>
                <MobileNavLink href="/profile" onClick={() => setIsMobileMenuOpen(false)} active={isActive('/profile')}>
                  Profile
                </MobileNavLink>
              </>
            )}
          </div>
          <div className="pt-4 pb-4 border-t border-gray-200 px-4">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500">{user.email}</div>
                <button
                  onClick={handleLogout}
                  className="text-[#FF385C] font-medium text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Link 
                  href="/auth/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-2 border border-gray-300 rounded-lg text-gray-700"
                >
                  Log in
                </Link>
                <Link 
                  href="/auth/register" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-2 bg-[#FF385C] text-white rounded-lg"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

// Sub-components for cleaner code
function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
        active
          ? 'border-[#FF385C] text-gray-900'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, onClick, active, children }: { href: string; onClick: () => void; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-3 py-2 rounded-md text-base font-medium ${
        active
          ? 'bg-pink-50 text-[#FF385C]'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  )
}