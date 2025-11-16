import { AuthProvider } from '@/components/AuthProvider'
import ChatBoxComponent from '@/components/ChatBox'
import Navbar from '@/components/Navbar'
import AdminNavbar from '@/components/AdminNavbar'
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
          {/* Conditionally render navbar based on route */}
          <NavbarWrapper />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <ChatBoxComponent />
        </AuthProvider>
      </body>
    </html>
  )
}

// Client component to handle navbar logic
function NavbarWrapper() {
  // This will be rendered on client side
  if (typeof window === 'undefined') {
    return <Navbar /> // Default during SSR
  }
  
  // Check if we're on an admin route
  const isAdminRoute = window.location.pathname.startsWith('/traceback-admin')
  
  if (isAdminRoute) {
    return null // Don't show user navbar on admin routes
  }
  
  return <Navbar />
}