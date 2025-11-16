'use client'

import { AuthProvider } from '@/components/AuthProvider'
import ChatBoxComponent from '@/components/ChatBox'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Traceback - Lost & Found',
  description: 'Find your lost items in MRT/LRT/KTM stations',
  icons: {
    icon: '/TRACEBACK.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/TRACEBACK.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <ChatBox />
        </AuthProvider>
      </body>
    </html>
  )
}

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'

function Navbar() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

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
              <Link href="/traceback-admin" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Admin
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
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

function ChatBox() {
  return <ChatBoxComponent />
}